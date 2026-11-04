// Decodes off the UI thread and keeps memory bounded whatever the file's size:
// - `rows` and `pick` return the rows the grid shows (a range, or scattered rows of a view);
// - `view` filters and sorts the whole file by streaming it in small slices, keeping only a
//   match mask and a sort order, and returns the physical rows of the result;
// - `export` writes the result as CSV or JSON, also slice by slice.
// A newer `view` or `export` request cancels the one still running.
import { cellText, columnCanMatch, compareValues, csvField, isNull, makeMatcher, toJson } from './format.js'
import { openParquet, readColumnValues, scanColumnPages } from './reader.js'
import { arrowSortKeys, openArrowRows, openArrowSearch } from './arrow-search.js'

const CACHE_CELLS = 400_000 // decoded cells kept for nearby requests (a row group, or a window of one)
// Parquet readers decode a column chunk (one column of one row group) whole. Before decoding one,
// its cost is estimated from the footer; past this budget it is skipped, never decoded, so no
// file can take the machine's memory. Calibrated on V8: about 48 bytes per value, 3 times the
// uncompressed data for strings, and 400 bytes per row to build nested values.
const DECODE_BUDGET = 250 * 1024 * 1024
const TOO_LARGE = { tooLarge: true }
const EXPORT_LIMIT = 60 * 1024 * 1024 // Orca saves at most 64 MiB

let file = null // { bytes, metadata, summary, generation }
let cached = null // { start, end, rows }
const latest = { view: 0, export: 0 } // the newest job of each kind; older ones stop
let filterCache = null // { key, mask: Uint8Array, count }
let sortCache = null // { col, order: Int32Array (ascending, nulls last), nulls }

const post = (message, transfer) => self.postMessage({ generation: file?.generation, ...message }, transfer ?? [])
const columnNames = (indices) => indices.map((i) => file.summary.columns[i].name)

/** One decode at a time: a scroll request never runs beside a search's decode. */
let queue = Promise.resolve()
// A macrotask between decodes: the browser collects garbage in idle time, and a loop of resolved
// promises alone never leaves any, so freed chunks would pile up until the heap limit.
const breathe = () => new Promise((resolve) => setTimeout(resolve, 0))
function serial(task) {
  const run = queue.then(task, task).then(async (result) => {
    await breathe()
    return result
  })
  queue = run.catch(() => undefined)
  return run
}

/** Estimated bytes to decode column `col` of row group `group`. */
function chunkCost(group, col) {
  const column = file.summary.columns[col]
  let values = 0
  let uncompressed = 0
  for (const chunk of file.metadata.row_groups[group].columns) {
    const meta = chunk.meta_data
    if (!meta || meta.path_in_schema[0] !== column.name) continue
    values += Number(meta.num_values)
    uncompressed += Number(meta.total_uncompressed_size)
  }
  const nested = column.kind === 'list' || column.kind === 'struct' || column.kind === 'map'
  return values * 48 + uncompressed * 3 + (nested ? file.summary.rowGroups[group].rows * 400 : 0)
}

/** Row groups overlapping rows [start, end), as { index, start, end }. */
function groupsIn(start, end) {
  const out = []
  let first = 0
  file.summary.rowGroups.forEach((group, index) => {
    const last = first + group.rows
    if (last > start && first < end) out.push({ index, start: first, end: last })
    first = last
  })
  return out
}

const tooLargeIn = (start, end, col) => groupsIn(start, end).some((group) => chunkCost(group.index, col) > DECODE_BUDGET)

/** Values of one column for rows [start, end), or null when decoding it would cost too much. */
function decodeColumn(start, end, col) {
  if (tooLargeIn(start, end, col)) return Promise.resolve(null)
  return serial(() => readColumnValues(file.bytes, file.metadata, start, end, file.summary.columns[col].name))
}

/** Rows [start, end) of `columns`, one column at a time; skipped columns hold TOO_LARGE. */
async function decodeRows(start, end, columns) {
  const count = end - start
  const rows = Array.from({ length: count }, () => new Array(columns.length))
  for (let c = 0; c < columns.length; c += 1) {
    const values = await decodeColumn(start, end, columns[c])
    for (let r = 0; r < count; r += 1) rows[r][c] = values ? values[r] : TOO_LARGE
  }
  return rows
}

function groupAround(row) {
  let start = 0
  for (const group of file.summary.rowGroups) {
    if (row < start + group.rows) return { start, end: start + group.rows }
    start += group.rows
  }
  return null
}

const allColumns = () => file.summary.columns.map((_, i) => i)

/**
 * Rows [start, end) of every column. Decodes a window around them (the whole row group when it is
 * small) and keeps it, so scrolling nearby costs a slice instead of another decode.
 */
// Decoded windows for display, from Arrow when WebAssembly runs here; null falls back to hyparquet.
const ARROW_WINDOW_BYTES = 64 * 1024 * 1024 // uncompressed data a window may cover
let arrowRows = undefined // undefined: not tried yet; null: unavailable
async function arrowRowsBetween(start, end) {
  if (arrowRows === undefined) {
    try {
      arrowRows = await openArrowRows(file.bytes, file.summary)
    } catch {
      arrowRows = null
    }
  }
  if (!arrowRows) return null
  if (!arrowRows.covers(start, end)) {
    // The whole row group when it is modest, else a window around the request.
    const group = groupAround(start)
    const index = file.summary.rowGroups.findIndex((_, i) => groupsIn(start, start + 1)[0]?.index === i)
    const bytes = index >= 0 ? file.metadata.row_groups[index].columns.reduce((sum, c) => sum + Number(c.meta_data?.total_uncompressed_size ?? 0), 0) : Infinity
    let from = start
    let to = end
    if (group && bytes <= ARROW_WINDOW_BYTES && end <= group.end) {
      from = group.start
      to = group.end
    } else {
      from = Math.max(0, start - 10_000)
      to = Math.min(file.summary.numRows, Math.max(end, from + 50_000))
    }
    await serial(() => arrowRows.load(from, to))
  }
  return arrowRows.rows(start, end)
}

async function rowsBetween(start, end) {
  const fromArrow = await arrowRowsBetween(start, end)
  if (fromArrow) return fromArrow
  if (cached && start >= cached.start && end <= cached.end) return cached.rows.slice(start - cached.start, end - cached.start)
  const group = groupAround(start)
  const columns = file.summary.columns.length
  const windowRows = Math.max(end - start, Math.floor(CACHE_CELLS / Math.max(1, columns)))
  let from = start
  let to = end
  if (group) {
    if (group.end - group.start <= windowRows) {
      from = group.start
      to = group.end
    } else {
      from = Math.max(group.start, start - Math.floor(windowRows / 4))
      to = Math.min(group.end, from + windowRows)
    }
    if (end > to) to = end // a request across groups: read it as asked
  }
  cached = { start: from, end: to, rows: await decodeRows(from, to, allColumns()) }
  return cached.rows.slice(start - from, end - from)
}

/** Scattered rows (sorted ascending), read as runs so neighbours share one decode. */
async function pick(rows) {
  const out = []
  let i = 0
  while (i < rows.length) {
    let j = i
    while (j + 1 < rows.length && rows[j + 1] - rows[j] <= 16 && rows[j + 1] - rows[i] < 512) j += 1
    const start = rows[i]
    const values = await rowsBetween(start, rows[j] + 1)
    for (let k = i; k <= j; k += 1) out.push(values[rows[k] - start])
    i = j + 1
  }
  return out
}

/**
 * Calls `visit(columnPosition, values, firstRow)` for each of `columns` in each row group: one
 * column chunk decoded at a time, the least memory a Parquet reader can work in.
 */
async function scan(columns, job, phase, visit, kind = 'view', skipped = new Set()) {
  const total = file.summary.numRows
  let start = 0
  for (const group of file.summary.rowGroups) {
    const end = start + group.rows
    for (let c = 0; c < columns.length; c += 1) {
      if (job !== latest[kind]) return false
      const values = await decodeColumn(start, end, columns[c])
      if (values) visit(c, values, start)
      else skipped.add(file.summary.columns[columns[c]].name)
      post({ type: 'progress', job, phase, done: start + Math.round((group.rows * (c + 1)) / columns.length), total })
    }
    start = end
  }
  return job === latest[kind]
}

async function buildFilter(term, shown, job) {
  const key = `${term}\u0000${shown.join(',')}`
  if (filterCache?.key === key) return filterCache
  const mask = new Uint8Array(file.summary.numRows)
  // Columns whose kind cannot show the term (a word in a number column) are never decoded.
  const columns = shown.filter((i) => columnCanMatch(file.summary.columns[i], term))
  const meta = columns.map((i) => file.summary.columns[i])
  const matches = makeMatcher(term)
  const skipped = new Set()
  let count = 0
  // Text, list and struct columns: Arrow bytes via parquet-wasm. Others: hyparquet, page by page.
  let arrow = null
  try {
    arrow = await openArrowSearch(file.bytes, columns.map((i) => file.summary.columns[i].name))
  } catch (error) {
    arrow = null // no WebAssembly here: every column takes the JavaScript path
  }
  const total = file.summary.numRows
  let groupStart = 0
  for (const group of file.summary.rowGroups) {
    const groupEnd = groupStart + group.rows
    for (let c = 0; c < columns.length; c += 1) {
      if (job !== latest.view) return null
      const col = columns[c]
      const name = file.summary.columns[col].name
      if (arrow?.textual.has(name)) {
        count += await serial(() => arrow.searchGroup(file.summary.rowGroups.indexOf(group), groupStart, name, term, mask))
        post({ type: 'progress', job, phase: 'filter', done: groupStart + Math.round((group.rows * (c + 1)) / columns.length), total })
        continue
      }
      if (tooLargeIn(groupStart, groupEnd, col)) {
        skipped.add(file.summary.columns[col].name)
        continue
      }
      await serial(() =>
        scanColumnPages(file.bytes, file.metadata, groupStart, groupEnd, file.summary.columns[col].name, (values, first) => {
          const last = Math.min(groupEnd, first + values.length)
          for (let row = Math.max(groupStart, first); row < last; row += 1) {
            if (mask[row]) continue
            if (matches(values[row - first], meta[c])) {
              mask[row] = 1
              count += 1
            }
          }
        })
      )
      post({ type: 'progress', job, phase: 'filter', done: groupStart + Math.round((group.rows * (c + 1)) / columns.length), total })
    }
    groupStart = groupEnd
  }
  arrow?.free()
  filterCache = { key, mask, count, skipped: [...skipped] }
  return filterCache
}

/** Nested values and bytes sort by their text, computed once per row rather than per comparison. */
function sortKey(value, column) {
  if (isNull(value)) return null
  if (typeof value === 'object' && !(value instanceof Date)) return cellText(value, column)
  return value
}

async function buildSort(col, job) {
  if (sortCache?.col === col) return sortCache
  if (tooLargeIn(0, file.summary.numRows, col)) {
    throw Object.assign(new Error(`${file.summary.columns[col].name} has row groups too large to sort safely in Orca.`), { kind: 'sort' })
  }
  // Numbers, dates and booleans: typed keys from Arrow, compared without an object per row.
  let typed = null
  try {
    typed = await serial(() => arrowSortKeys(file.bytes, file.summary, col))
  } catch {
    typed = null
  }
  if (typed) {
    if (job !== latest.view) return null
    const { keys: values, isNull: nulls } = typed
    const rows = []
    for (let i = 0; i < values.length; i += 1) if (!nulls[i]) rows.push(i)
    const order = new Int32Array(values.length)
    order.set(rows)
    order.subarray(0, rows.length).sort((a, b) => (values[a] < values[b] ? -1 : values[a] > values[b] ? 1 : a - b))
    let n = rows.length
    for (let i = 0; i < values.length; i += 1) if (nulls[i]) order[n++] = i
    sortCache = { col, order, nonNull: rows.length }
    return sortCache
  }
  const keys = new Array(file.summary.numRows)
  const column = file.summary.columns[col]
  const finished = await scan([col], job, 'sort', (c, values, first) => {
    for (let r = 0; r < values.length; r += 1) keys[first + r] = sortKey(values[r], column)
  })
  if (!finished) return null
  post({ type: 'progress', job, phase: 'ordering', done: 0, total: 1 })
  const rows = []
  let nulls = 0
  for (let i = 0; i < keys.length; i += 1) {
    if (keys[i] === null) nulls += 1
    else rows.push(i)
  }
  rows.sort((a, b) => compareValues(keys[a], keys[b]) || a - b)
  const order = new Int32Array(keys.length)
  order.set(rows)
  let n = rows.length
  for (let i = 0; i < keys.length; i += 1) if (keys[i] === null) order[n++] = i
  sortCache = { col, order, nonNull: rows.length }
  return sortCache
}

/** The physical rows of a filtered and/or sorted view; nulls stay last in both directions. */
async function view({ job, filter, sort }) {
  const filtered = filter ? await buildFilter(filter.term, filter.columns, job) : null
  if (filter && !filtered) return null
  const sorted = sort ? await buildSort(sort.col, job) : null
  if (sort && !sorted) return null
  const total = file.summary.numRows
  let order
  if (sorted) {
    const { order: ascending, nonNull } = sorted
    order = new Int32Array(total)
    if (sort.dir === 1) order.set(ascending)
    else {
      for (let i = 0; i < nonNull; i += 1) order[i] = ascending[nonNull - 1 - i]
      order.set(ascending.subarray(nonNull), nonNull)
    }
  }
  const keep = filtered?.mask
  const out = new Int32Array(filtered ? filtered.count : total)
  let n = 0
  for (let i = 0; i < total; i += 1) {
    const row = order ? order[i] : i
    if (!keep || keep[row]) out[n++] = row
  }
  return { rows: out, skipped: filtered?.skipped ?? [] }
}

async function exportRows({ job, format, rows, columns }) {
  const meta = columns.map((i) => file.summary.columns[i])
  const names = meta.map((column) => column.name)
  const parts = []
  let size = 0
  let count = 0
  let truncated = false
  if (format === 'csv') parts.push(`${names.map((name) => csvField(name, {})).join(',')}\n`)
  if (format === 'json') parts.push('[\n')
  const total = rows ? rows.length : file.summary.numRows
  const step = Math.max(256, Math.floor(CACHE_CELLS / Math.max(1, columns.length)))
  for (let start = 0; start < total && !truncated; start += step) {
    if (job !== latest.export) return null
    const end = Math.min(total, start + step)
    const slice = rows
      ? await pickInOrder(rows.subarray(start, end), columns)
      : await decodeRows(start, end, columns)
    for (const values of slice) {
      let line
      if (format === 'csv') line = `${values.map((value, c) => csvField(value, meta[c])).join(',')}\n`
      else {
        const object = Object.fromEntries(names.map((name, c) => [name, values[c]]))
        line = format === 'json' ? `${count ? ',\n' : ''}  ${toJson(object)}` : `${toJson(object)}\n`
      }
      size += line.length
      if (size > EXPORT_LIMIT) {
        truncated = true
        break
      }
      parts.push(line)
      count += 1
    }
    post({ type: 'progress', job, phase: 'export', done: end, total })
  }
  if (format === 'json') parts.push('\n]\n')
  return { text: parts.join(''), count, truncated }
}

/** Rows of a view slice, in view order, with only the exported columns. */
async function pickInOrder(viewRows, columns) {
  const sorted = Int32Array.from(viewRows).sort()
  const values = await pick(sorted)
  const byRow = new Map()
  sorted.forEach((row, i) => byRow.set(row, values[i]))
  return Array.from(viewRows, (row) => columns.map((c) => byRow.get(row)[c]))
}

const IS_CHILD = new URL(import.meta.url).searchParams.has('child')
let child = null
function runInChild(data) {
  child?.terminate()
  const worker = new Worker(new URL('./reader-worker.js?child', import.meta.url), { type: 'module' })
  child = worker
  worker.onmessage = ({ data: message }) => {
    if (message.type === 'opened') return
    if (message.type === 'view' || message.type === 'error') {
      worker.terminate()
      if (child === worker) child = null
    }
    self.postMessage(message, message.rows ? [message.rows.buffer] : [])
  }
  worker.onerror = (event) => {
    worker.terminate()
    if (child === worker) child = null
    self.postMessage({ generation: file.generation, type: 'error', request: 'view', message: event.message ?? 'search worker failed' })
  }
  worker.postMessage({ type: 'open', bytes: file.bytes.slice(0), generation: file.generation })
  worker.postMessage(data)
}

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'open') {
      latest.view += 1
      latest.export += 1
      child?.terminate()
      child = null
      const { metadata, summary } = openParquet(data.bytes)
      file = { bytes: data.bytes, metadata, summary, generation: data.generation }
      cached = null
      arrowRows = undefined
      filterCache = null
      sortCache = null
      post({ type: 'opened', summary })
      return
    }
    if (!file || file.generation !== data.generation) return
    if (data.type === 'rows') {
      post({ type: 'rows', start: data.start, rows: await rowsBetween(data.start, data.end) })
    } else if (data.type === 'pick') {
      post({ type: 'picked', rows: data.rows, values: await pick(data.rows) })
    } else if (data.type === 'view' && !IS_CHILD) {
      latest.view = data.job
      runInChild(data)
    } else if (data.type === 'view') {
      latest.view = data.job
      const result = await view(data)
      if (result && data.job === latest.view) post({ type: 'view', job: data.job, ...result }, [result.rows.buffer])
    } else if (data.type === 'export') {
      latest.export = data.job
      const result = await exportRows(data)
      if (result && data.job === latest.export) post({ type: 'exported', job: data.job, format: data.format, ...result })
    }
  } catch (error) {
    post({ type: 'error', request: data.type, start: data.start, message: String(error?.message ?? error) })
  }
}
