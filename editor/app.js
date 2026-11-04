window.__pluginStarted = true
// Parquet viewer: reads the file Orca hands this editor (its bytes), decodes it in a worker and
// shows the rows in a grid that draws only what is on screen, plus the schema and file details.
import { cellText, detailText, formatBytes, isNull, toJson } from './format.js'

const CHUNK = 500 // rows per range request while scrolling an unsorted, unfiltered file
const CACHE_CELLS = 400_000 // decoded cells kept for redraws; the file itself stays in the worker
const ROW = 26
const HEAD = 40
const OVERSCAN = 8

const $ = (id) => document.getElementById(id)
const els = {
  grid: $('grid'), spacer: $('spacer'), cells: $('cells'), gutter: $('gutter'), header: $('header'), corner: $('corner'),
  status: $('status'), viewNote: $('viewNote'), search: $('search'),
  columnsToggle: $('columnsToggle'), columnsMenu: $('columnsMenu'), exportToggle: $('exportToggle'), exportMenu: $('exportMenu'),
  detail: $('detail'), detailTitle: $('detailTitle'), detailType: $('detailType'), detailValue: $('detailValue'),
  detailClose: $('detailClose'), copyValue: $('copyValue'), copyRow: $('copyRow'),
  schema: $('panel-schema'), info: $('panel-info'), message: $('message')
}

const state = {
  generation: 0,
  summary: null,
  columns: [], // { name, type, kind, isDate, width, hidden }
  cache: new Map(), // physical row -> values, least recently drawn first
  cacheRows: 0, // how many rows `cache` may hold
  requested: new Set(), // physical rows asked for and not yet back
  inFlight: false,
  view: null, // Int32Array of physical rows when sorted or filtered, else null
  sort: null, // { col, dir: 1 | -1 }
  filter: '',
  job: 0, // the newest view request
  exportJob: 0,
  busy: null, // { phase, done, total } while the worker filters, sorts or exports
  selected: null, // { row (view index), col (index into columns) }
  gutterWidth: 60
}

let worker
try {
  worker = new Worker(new URL('./reader-worker.js', import.meta.url), { type: 'module' })
} catch (error) {
  // Without the desktop app's isolated frame, workers cannot load from the plugin folder.
  document.getElementById('message').hidden = false
  document.querySelector('#message .title').textContent = 'This viewer needs the Orca desktop app'
  document.querySelector('#message .muted').textContent = `It reads Parquet in a background worker, which this Orca client cannot start (${error.message}). Open the file in Orca's desktop app.`
  throw error
}

// ------------------------------------------------------------------ loading

function showMessage(title, text = '') {
  els.message.hidden = false
  els.message.querySelector('.title').textContent = title
  els.message.querySelector('.muted').textContent = text
}

function open(bytes) {
  state.generation += 1
  Object.assign(state, { summary: null, cache: new Map(), requested: new Set(), inFlight: false, view: null, selected: null, busy: null })
  els.detail.hidden = true
  els.status.textContent = `Reading ${formatBytes(bytes.byteLength)}…`
  worker.postMessage({ type: 'open', bytes, generation: state.generation }, [bytes])
}

worker.onmessage = ({ data }) => {
  if (data.generation !== state.generation) return
  if (data.type === 'opened') onOpened(data.summary)
  else if (data.type === 'rows') onRows(Array.from({ length: data.rows.length }, (_, i) => data.start + i), data.rows)
  else if (data.type === 'picked') onRows(data.rows, data.values)
  else if (data.type === 'progress') onProgress(data)
  else if (data.type === 'view') onView(data)
  else if (data.type === 'exported') void onExported(data)
  else if (data.type === 'error') {
    if (data.request === 'open') showMessage('This file could not be read as Parquet', data.message)
    else {
      els.viewNote.textContent = `Could not read rows: ${data.message}`
      if (data.request === 'rows' || data.request === 'pick') {
        state.inFlight = false
        state.requested.clear()
      }
      if (data.request === 'view' || data.request === 'export') {
        state.busy = null
        if (data.request === 'view' && state.sort) state.sort = null
        layout()
        els.viewNote.textContent = data.message
        return
      }
    }
  }
}
worker.onerror = (event) => showMessage('The Parquet reader stopped', event.message ?? '')

const DEFAULT_WIDTH = { number: 110, boolean: 80, time: 170, string: 180, binary: 160, list: 220, struct: 240, map: 240 }

function onOpened(summary) {
  const previous = new Map(state.columns.map((column) => [column.name, column]))
  state.summary = summary
  state.columns = summary.columns.map((column) => ({
    ...column,
    width: previous.get(column.name)?.width ?? DEFAULT_WIDTH[column.kind] ?? 160,
    hidden: previous.get(column.name)?.hidden ?? false
  }))
  state.cacheRows = Math.max(400, Math.floor(CACHE_CELLS / Math.max(1, summary.columns.length)))
  state.gutterWidth = Math.max(48, String(summary.numRows).length * 8 + 22)
  els.message.hidden = true
  renderSchema()
  renderInfo()
  renderColumnsMenu()
  layout()
  updateStatus()
  if (state.filter || state.sort) requestView()
}

function onRows(rows, values) {
  for (let i = 0; i < rows.length; i += 1) {
    state.cache.delete(rows[i])
    state.cache.set(rows[i], values[i])
    state.requested.delete(rows[i])
  }
  // Oldest first: drop what was drawn longest ago.
  for (const row of state.cache.keys()) {
    if (state.cache.size <= state.cacheRows) break
    state.cache.delete(row)
  }
  state.inFlight = false
  render()
}

/** A row for drawing, marked as recently used; undefined until the worker sends it. */
function rowValues(row) {
  const values = state.cache.get(row)
  if (values !== undefined) {
    state.cache.delete(row)
    state.cache.set(row, values)
  }
  return values
}

/** Asks for the rows on screen that are not cached: one range when unsorted, else exactly those rows. */
function requestVisible(first, last) {
  if (!state.summary || state.inFlight) return
  const missing = []
  for (let i = first; i <= last; i += 1) {
    const row = physicalRow(i)
    if (!state.cache.has(row) && !state.requested.has(row)) missing.push(row)
  }
  if (missing.length === 0) return
  state.inFlight = true
  if (!state.view) {
    const start = Math.floor(missing[0] / CHUNK) * CHUNK
    const end = Math.min(state.summary.numRows, Math.max(start + CHUNK, missing[missing.length - 1] + 1))
    for (let row = start; row < end; row += 1) state.requested.add(row)
    worker.postMessage({ type: 'rows', generation: state.generation, start, end })
  } else {
    const rows = Int32Array.from(missing).sort()
    for (const row of rows) state.requested.add(row)
    worker.postMessage({ type: 'pick', generation: state.generation, rows })
  }
}

// ------------------------------------------------------------------ sort and filter (in the worker)

const viewLength = () => (state.view ? state.view.length : (state.summary?.numRows ?? 0))
const physicalRow = (index) => (state.view ? state.view[index] : index)
const shownColumnIndices = () => state.columns.map((column, i) => (column.hidden ? -1 : i)).filter((i) => i >= 0)

/** Filters and sorts the whole file in the worker, which streams it in small slices. */
function requestView() {
  if (!state.summary) return
  state.job += 1
  if (!state.filter && !state.sort) {
    state.view = null
    state.busy = null
    afterViewChange()
    return
  }
  state.busy = { phase: state.filter ? 'filter' : 'sort', done: 0, total: state.summary.numRows }
  updateStatus()
  worker.postMessage({
    type: 'view',
    generation: state.generation,
    job: state.job,
    filter: state.filter ? { term: state.filter, columns: shownColumnIndices() } : null,
    sort: state.sort
  })
}

function onProgress({ job, phase, done, total }) {
  if (phase === 'export' ? job !== state.exportJob : job !== state.job) return
  state.busy = { phase, done, total }
  updateStatus()
}

function onView({ job, rows, skipped }) {
  if (job !== state.job) return
  state.view = rows
  state.busy = null
  state.skipped = skipped ?? []
  afterViewChange()
}

function afterViewChange() {
  state.selected = null
  els.detail.hidden = true
  state.cache.clear() // rows were picked for the previous order; start clean
  state.requested.clear()
  state.inFlight = false
  els.grid.scrollTop = 0
  layout()
  updateStatus()
}

// The search starts once typing pauses for this long (Enter starts it at once). A newer search
// closes the worker running the older one, so typing on never piles up scans.
const SEARCH_PAUSE_MS = 500

function applySearch() {
  const next = els.search.value.trim()
  if (next === state.filter) return
  state.filter = next
  requestView()
}

let filterTimer = 0
els.search.addEventListener('input', () => {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(applySearch, SEARCH_PAUSE_MS)
})
els.search.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    clearTimeout(filterTimer)
    applySearch()
  } else if (event.key === 'Escape' && els.search.value) {
    event.stopPropagation()
    els.search.value = ''
    applySearch()
  }
})

function toggleSort(col) {
  if (!state.sort || state.sort.col !== col) state.sort = { col, dir: 1 }
  else if (state.sort.dir === 1) state.sort = { col, dir: -1 }
  else state.sort = null
  requestView()
}

// ------------------------------------------------------------------ grid drawing

function visibleColumns() {
  const list = []
  let x = state.gutterWidth
  state.columns.forEach((column, index) => {
    if (column.hidden) return
    list.push({ column, index, x })
    x += column.width
  })
  return { list, width: x }
}

function layout() {
  const { width } = visibleColumns()
  els.spacer.style.width = `${width}px`
  els.spacer.style.height = `${HEAD + viewLength() * ROW}px`
  render()
}

const CLASS_BY_KIND = { number: 'num', time: 'mono', binary: 'mono', list: 'nested', struct: 'nested', map: 'nested' }

function cell(className, left, top, width, text) {
  const node = document.createElement('div')
  node.className = className
  node.style.left = `${left}px`
  node.style.top = `${top}px`
  node.style.width = `${width}px`
  node.textContent = text
  return node
}

let frame = 0
function render() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(draw)
}

function draw() {
  if (!state.summary) return
  const { scrollTop, scrollLeft, clientWidth, clientHeight } = els.grid
  const { list } = visibleColumns()
  const shown = list.filter(({ x, column }) => x + column.width >= scrollLeft + state.gutterWidth && x <= scrollLeft + clientWidth)
  const total = viewLength()
  const first = Math.max(0, Math.floor((scrollTop) / ROW) - OVERSCAN)
  const last = Math.min(total - 1, Math.ceil((scrollTop + clientHeight) / ROW) + OVERSCAN)

  const body = document.createDocumentFragment()
  const gutter = document.createDocumentFragment()
  for (let i = first; i <= last; i += 1) {
    const row = physicalRow(i)
    const values = rowValues(row)
    const top = HEAD + i * ROW
    const odd = i % 2 ? ' odd' : ''
    const selectedRow = state.selected?.row === i
    gutter.append(cell(`cell${odd}${selectedRow ? ' selected-row' : ''}`, scrollLeft, top, state.gutterWidth, String(row + 1)))
    for (const { column, index, x } of shown) {
      let className = `cell${odd}`
      let text
      if (!values) {
        className += ' loading'
        text = '…'
      } else {
        const value = values[index]
        text = cellText(value, column)
        if (text === null) {
          className += ' null'
          text = 'null'
        } else {
          className += CLASS_BY_KIND[column.kind] ? ` ${CLASS_BY_KIND[column.kind]}` : ''
          if (text.length > 400) text = `${text.slice(0, 400)}…`
        }
      }
      if (selectedRow && state.selected.col === index) className += ' selected'
      const node = cell(className, x, top, column.width, text)
      node.dataset.row = String(i)
      node.dataset.col = String(index)
      body.append(node)
    }
  }
  els.cells.replaceChildren(body)
  els.gutter.replaceChildren(gutter)

  const head = document.createDocumentFragment()
  for (const { column, index, x } of shown) {
    const node = cell('head', x, scrollTop, column.width, '')
    node.dataset.col = String(index)
    node.title = `${column.name}\n${column.type}\nClick to sort`
    const name = document.createElement('div')
    name.className = 'name'
    name.textContent = column.name
    const type = document.createElement('div')
    type.className = 'type'
    type.textContent = column.type
    node.append(name, type)
    if (state.sort?.col === index) {
      const arrow = document.createElement('span')
      arrow.className = 'sort'
      arrow.textContent = state.sort.dir === 1 ? '▲' : '▼'
      node.append(arrow)
    }
    const grip = document.createElement('div')
    grip.className = 'resize'
    grip.dataset.resize = String(index)
    node.append(grip)
    head.append(node)
  }
  els.header.replaceChildren(head)
  Object.assign(els.corner.style, { left: `${scrollLeft}px`, top: `${scrollTop}px`, width: `${state.gutterWidth}px` })
  requestVisible(first, last)
}

els.grid.addEventListener('scroll', render, { passive: true })
new ResizeObserver(render).observe(els.grid)

// Header: sort on click, resize by dragging the edge (double-click fits the content).
els.header.addEventListener('pointerdown', (event) => {
  const grip = event.target.closest('[data-resize]')
  if (!grip) return
  event.preventDefault()
  event.stopPropagation()
  const column = state.columns[Number(grip.dataset.resize)]
  const startX = event.clientX
  const startWidth = column.width
  grip.classList.add('dragging')
  const move = (e) => {
    column.width = Math.max(48, Math.min(1200, startWidth + e.clientX - startX))
    layout()
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
})
els.header.addEventListener('click', (event) => {
  if (event.target.closest('[data-resize]')) return
  const head = event.target.closest('.head')
  if (head) toggleSort(Number(head.dataset.col))
})
els.header.addEventListener('dblclick', (event) => {
  const grip = event.target.closest('[data-resize]')
  if (!grip) return
  const index = Number(grip.dataset.resize)
  const column = state.columns[index]
  let longest = column.name.length
  const first = Math.floor(els.grid.scrollTop / ROW)
  for (let i = first; i < Math.min(viewLength(), first + 200); i += 1) {
    const values = state.cache.get(physicalRow(i))
    const text = values ? cellText(values[index], column) : ''
    longest = Math.max(longest, Math.min(80, (text ?? 'null').length))
  }
  column.width = Math.max(60, Math.min(700, longest * 7.4 + 24))
  layout()
})

// ------------------------------------------------------------------ selection, detail, copy

function select(row, col) {
  if (row < 0 || row >= viewLength()) return
  state.selected = { row, col }
  // Keep the cell on screen.
  const top = HEAD + row * ROW
  if (top < els.grid.scrollTop + HEAD) els.grid.scrollTop = top - HEAD
  else if (top + ROW > els.grid.scrollTop + els.grid.clientHeight) els.grid.scrollTop = top + ROW - els.grid.clientHeight
  const entry = visibleColumns().list.find((item) => item.index === col)
  if (entry) {
    if (entry.x < els.grid.scrollLeft + state.gutterWidth) els.grid.scrollLeft = entry.x - state.gutterWidth
    else if (entry.x + entry.column.width > els.grid.scrollLeft + els.grid.clientWidth) els.grid.scrollLeft = entry.x + entry.column.width - els.grid.clientWidth
  }
  if (!els.detail.hidden) showDetail()
  render()
}

function selectedValue() {
  if (!state.selected) return { ready: false }
  const values = state.cache.get(physicalRow(state.selected.row))
  if (!values) return { ready: false }
  return { ready: true, values, value: values[state.selected.col], column: state.columns[state.selected.col] }
}

function rowObject(values) {
  return Object.fromEntries(state.columns.map((column, i) => [column.name, values[i]]))
}

function showDetail() {
  const { ready, value, column } = selectedValue()
  if (!ready) return
  els.detail.hidden = false
  els.detailTitle.textContent = column.name
  els.detailType.textContent = `${column.type}, row ${(physicalRow(state.selected.row) + 1).toLocaleString()}`
  els.detailValue.textContent = detailText(value, column)
  render()
}

els.cells.addEventListener('click', (event) => {
  const node = event.target.closest('.cell')
  if (!node?.dataset.col) return
  select(Number(node.dataset.row), Number(node.dataset.col))
  els.grid.focus({ preventScroll: true })
})
els.cells.addEventListener('dblclick', () => showDetail())
els.detailClose.addEventListener('click', () => {
  els.detail.hidden = true
  els.grid.focus()
})

/** Frames have no clipboard permission; a copy inside a key press or click still works. */
function copyText(text) {
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.append(area)
  area.select()
  const ok = document.execCommand('copy')
  area.remove()
  els.viewNote.textContent = ok ? 'Copied.' : 'Copy was blocked.'
  setTimeout(updateStatus, 1500)
}
els.copyValue.addEventListener('click', () => {
  const { ready, value, column } = selectedValue()
  if (ready) copyText(isNull(value) ? '' : detailText(value, column))
})
els.copyRow.addEventListener('click', () => {
  const { ready, values } = selectedValue()
  if (ready) copyText(toJson(rowObject(values), 2))
})

els.grid.addEventListener('keydown', (event) => {
  const mod = event.ctrlKey || event.metaKey
  if (mod && event.key.toLowerCase() === 'c') {
    const { ready, value, column, values } = selectedValue()
    if (!ready) return
    event.preventDefault()
    copyText(event.shiftKey ? toJson(rowObject(values), 2) : isNull(value) ? '' : detailText(value, column))
    return
  }
  if (mod && event.key.toLowerCase() === 'f') {
    event.preventDefault()
    els.search.focus()
    return
  }
  const order = visibleColumns().list.map((item) => item.index)
  const current = state.selected ?? { row: 0, col: order[0] }
  const position = order.indexOf(current.col)
  const page = Math.max(1, Math.floor(els.grid.clientHeight / ROW) - 2)
  const moves = {
    ArrowDown: [current.row + 1, current.col],
    ArrowUp: [current.row - 1, current.col],
    ArrowRight: [current.row, order[Math.min(order.length - 1, position + 1)]],
    ArrowLeft: [current.row, order[Math.max(0, position - 1)]],
    PageDown: [Math.min(viewLength() - 1, current.row + page), current.col],
    PageUp: [Math.max(0, current.row - page), current.col],
    Home: [mod ? 0 : current.row, mod ? current.col : order[0]],
    End: [mod ? viewLength() - 1 : current.row, mod ? current.col : order[order.length - 1]]
  }
  if (moves[event.key]) {
    event.preventDefault()
    select(...moves[event.key])
  } else if (event.key === 'Enter') {
    event.preventDefault()
    showDetail()
  } else if (event.key === 'Escape' && !els.detail.hidden) {
    els.detail.hidden = true
  }
})

// ------------------------------------------------------------------ menus

function closeMenus(except) {
  for (const [menu, toggle] of [[els.columnsMenu, els.columnsToggle], [els.exportMenu, els.exportToggle]]) {
    if (menu === except) continue
    menu.hidden = true
    toggle.setAttribute('aria-expanded', 'false')
  }
}
function toggleMenu(menu, toggle) {
  const opening = menu.hidden
  closeMenus(menu)
  menu.hidden = !opening
  toggle.setAttribute('aria-expanded', String(opening))
  if (opening) menu.querySelector('input, button')?.focus()
}
els.columnsToggle.addEventListener('click', (event) => {
  event.stopPropagation()
  toggleMenu(els.columnsMenu, els.columnsToggle)
})
els.exportToggle.addEventListener('click', (event) => {
  event.stopPropagation()
  toggleMenu(els.exportMenu, els.exportToggle)
})
document.addEventListener('click', (event) => {
  if (!event.target.closest('.popover')) closeMenus()
})
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenus()
})

function renderColumnsMenu() {
  const menu = els.columnsMenu
  menu.replaceChildren()
  const actions = document.createElement('div')
  actions.className = 'actions'
  const all = document.createElement('button')
  all.textContent = 'Show all'
  all.addEventListener('click', () => setAllHidden(false))
  const none = document.createElement('button')
  none.textContent = 'Hide all'
  none.addEventListener('click', () => setAllHidden(true))
  actions.append(all, none)
  menu.append(actions)
  state.columns.forEach((column) => {
    const label = document.createElement('label')
    label.className = 'item'
    const box = document.createElement('input')
    box.type = 'checkbox'
    box.checked = !column.hidden
    box.addEventListener('change', () => {
      column.hidden = !box.checked
      afterColumnsChange()
    })
    const name = document.createElement('span')
    name.textContent = column.name
    const type = document.createElement('span')
    type.className = 'type'
    type.textContent = column.type
    label.append(box, name, type)
    menu.append(label)
  })
}
function setAllHidden(hidden) {
  for (const column of state.columns) column.hidden = hidden
  renderColumnsMenu()
  afterColumnsChange()
}
function afterColumnsChange() {
  if (state.filter) requestView() // the filter searches the visible columns
  layout()
  updateStatus()
}

// ------------------------------------------------------------------ export

// The worker writes the file; the save dialog opens when it is ready. A save needs the click's
// user activation, which lasts only a few seconds, so the click also starts the work at once.
let pendingSave = null
els.exportMenu.addEventListener('click', (event) => {
  const format = event.target.closest('[data-format]')?.dataset.format
  if (!format || !state.summary) return
  closeMenus()
  if (!orca.files?.saveAs) {
    els.viewNote.textContent = 'Saving needs the Orca desktop app.'
    return
  }
  state.exportJob += 1
  pendingSave = { job: state.exportJob, format }
  state.busy = { phase: 'export', done: 0, total: viewLength() }
  updateStatus()
  worker.postMessage({
    type: 'export',
    generation: state.generation,
    job: state.exportJob,
    format,
    rows: state.view,
    columns: shownColumnIndices()
  })
})

async function onExported({ job, format, text, count, truncated }) {
  if (pendingSave?.job !== job) return
  pendingSave = null
  state.busy = null
  updateStatus()
  try {
    const { status } = await orca.files.saveAs({
      suggestedName: `${state.view ? 'rows-shown' : 'rows'}.${format}`,
      mimeType: format === 'csv' ? 'text/csv' : 'application/json',
      data: text
    })
    if (status === 'saved') {
      els.viewNote.textContent = truncated
        ? `Saved the first ${count.toLocaleString()} rows: Orca saves files up to 64 MB. Filter or hide columns to export the rest.`
        : `Saved ${count.toLocaleString()} rows.`
    }
  } catch (error) {
    // Past the click's activation window (a slow export), Orca refuses the dialog: offer a retry.
    els.viewNote.textContent =
      error.code === 'not_permitted' ? 'The export is ready: choose Export again to save it.' : `Could not save: ${error.message}`
    if (error.code === 'not_permitted') readyExport = { format, text }
  }
}

// A finished export whose dialog was refused; the next click saves it without redoing the work.
let readyExport = null
els.exportMenu.addEventListener(
  'click',
  async (event) => {
    const format = event.target.closest('[data-format]')?.dataset.format
    if (!readyExport || readyExport.format !== format) return
    event.stopImmediatePropagation()
    closeMenus()
    const { text } = readyExport
    readyExport = null
    const { status } = await orca.files.saveAs({
      suggestedName: `${state.view ? 'rows-shown' : 'rows'}.${format}`,
      mimeType: format === 'csv' ? 'text/csv' : 'application/json',
      data: text
    })
    if (status === 'saved') els.viewNote.textContent = 'Saved.'
  },
  true
)

// ------------------------------------------------------------------ schema and info tabs

function table(headers, rows, classes = []) {
  const node = document.createElement('table')
  const head = node.createTHead().insertRow()
  headers.forEach((text, i) => {
    const th = document.createElement('th')
    th.textContent = text
    if (classes[i]?.includes('num')) th.style.textAlign = 'right'
    head.append(th)
  })
  const body = node.createTBody()
  for (const values of rows) {
    const row = body.insertRow()
    values.forEach((value, i) => {
      const td = row.insertCell()
      if (value instanceof Node) td.append(value)
      else td.textContent = value ?? ''
      if (classes[i]) td.className = classes[i]
    })
  }
  return node
}

function heading(text) {
  const node = document.createElement('h2')
  node.textContent = text
  return node
}

function renderSchema() {
  const { schema } = state.summary
  const rows = schema.map((field) => {
    const name = document.createElement('span')
    name.className = 'schema-name'
    const twig = document.createElement('span')
    twig.className = 'twig'
    twig.textContent = field.depth ? `${'  '.repeat(field.depth - 1)}└ ` : ''
    twig.style.whiteSpace = 'pre'
    name.append(twig, document.createTextNode(field.name))
    return [name, field.type, field.physical, field.repetition.toLowerCase(), field.fieldId ?? '']
  })
  // Field ids appear only in files written with them (Iceberg, some Spark jobs).
  const hasIds = schema.some((field) => field.fieldId !== null)
  els.schema.replaceChildren(
    heading(`Schema: ${state.summary.columns.length} columns, ${schema.length} fields`),
    hasIds
      ? table(['Field', 'Type', 'Physical type', 'Repetition', 'Field id'], rows, ['', 'mono', 'mono', '', 'num'])
      : table(['Field', 'Type', 'Physical type', 'Repetition'], rows.map((row) => row.slice(0, 4)), ['', 'mono', 'mono', ''])
  )
}

function statText(value, leaf) {
  if (value === undefined || value === null) return ''
  const text = cellText(value, { isDate: leaf.isDate }) ?? ''
  return text.length > 60 ? `${text.slice(0, 60)}…` : text
}

function renderInfo() {
  const s = state.summary
  const overview = document.createElement('dl')
  const add = (term, value) => {
    const dt = document.createElement('dt')
    dt.textContent = term
    const dd = document.createElement('dd')
    dd.textContent = value
    overview.append(dt, dd)
  }
  add('Rows', s.numRows.toLocaleString())
  add('Columns', `${s.columns.length.toLocaleString()} (${s.leaves.length.toLocaleString()} leaf columns)`)
  add('Row groups', s.rowGroups.length.toLocaleString())
  add('File size', formatBytes(s.fileSize))
  add('Data size', `${formatBytes(s.compressed)} compressed, ${formatBytes(s.uncompressed)} uncompressed${s.compressed ? ` (${(s.uncompressed / s.compressed).toFixed(1)}×)` : ''}`)
  add('Compression', [...new Set(s.leaves.flatMap((leaf) => leaf.codecs))].join(', ').toLowerCase() || 'none')
  add('Format version', String(s.version))
  add('Footer', formatBytes(s.footerSize))
  if (s.createdBy) add('Created by', s.createdBy)

  const columns = table(
    ['Column', 'Type', 'Codec', 'Encodings', 'Compressed', 'Uncompressed', 'Nulls', 'Min', 'Max'],
    s.leaves.map((leaf) => [
      leaf.path,
      leaf.type,
      leaf.codecs.join(', ').toLowerCase(),
      leaf.encodings.join(', ').toLowerCase(),
      formatBytes(leaf.compressed),
      formatBytes(leaf.uncompressed),
      leaf.nulls === null ? '' : leaf.nulls.toLocaleString(),
      statText(leaf.min, leaf),
      statText(leaf.max, leaf)
    ]),
    ['mono', 'mono', '', 'muted', 'num', 'num', 'num', 'mono', 'mono']
  )
  const groups = table(
    ['Row group', 'Rows', 'Compressed size'],
    s.rowGroups.map((group) => [String(group.index), group.rows.toLocaleString(), formatBytes(group.bytes)]),
    ['num', 'num', 'num']
  )
  const parts = [heading('File'), overview, heading('Columns'), columns, heading('Row groups'), groups]
  if (s.keyValue.length) {
    parts.push(heading('Key-value metadata'))
    for (const { key, value } of s.keyValue) {
      const details = document.createElement('details')
      const summary = document.createElement('summary')
      summary.className = 'mono'
      summary.textContent = `${key} (${formatBytes(value.length)})`
      const pre = document.createElement('pre')
      let text = value
      try {
        text = JSON.stringify(JSON.parse(value), null, 2)
      } catch {
        // Not JSON: as is.
      }
      pre.textContent = text
      details.append(summary, pre)
      parts.push(details)
    }
  }
  els.info.replaceChildren(...parts)
}

// ------------------------------------------------------------------ tabs and status

for (const tab of document.querySelectorAll('[role=tab]')) {
  tab.addEventListener('click', () => {
    for (const other of document.querySelectorAll('[role=tab]')) {
      const selected = other === tab
      other.setAttribute('aria-selected', String(selected))
      $(other.getAttribute('aria-controls')).hidden = !selected
    }
    const data = tab.id === 'tab-data'
    for (const control of [els.search.closest('.search'), els.columnsToggle, els.exportToggle]) control.hidden = !data
    if (data) layout()
  })
}

const PHASES = { filter: 'Filtering', sort: 'Sorting', ordering: 'Ordering', export: 'Exporting' }

function updateStatus() {
  const s = state.summary
  if (!s) return
  const shown = state.columns.filter((column) => !column.hidden).length
  const columns = shown === s.columns.length ? `${s.columns.length} columns` : `${shown} of ${s.columns.length} columns`
  els.status.textContent =
    state.view && state.filter
      ? `${state.view.length.toLocaleString()} of ${s.numRows.toLocaleString()} rows match, ${columns}`
      : `${s.numRows.toLocaleString()} rows, ${columns}`
  const notes = []
  if (state.busy) {
    const percent = state.busy.total ? Math.floor((100 * state.busy.done) / state.busy.total) : 0
    notes.push(`${PHASES[state.busy.phase] ?? 'Working'}… ${state.busy.phase === 'ordering' ? '' : `${percent}%`}`.trim())
  }
  if (state.sort && !state.busy) notes.push(`sorted by ${state.columns[state.sort.col].name} ${state.sort.dir === 1 ? 'ascending' : 'descending'}`)
  if (state.filter && !state.busy && state.skipped?.length) notes.push(`not searched (too large to load): ${state.skipped.join(', ')}`)
  els.viewNote.textContent = notes.join(', ')
}

// ------------------------------------------------------------------ start

if (!orca.document) {
  showMessage('This Orca is too old', 'The Parquet viewer needs Orca 1.4.246 or newer.')
} else {
  // The current file now, and again whenever it changes on disk.
  orca.document.onDidChange((doc) => {
    if (doc.content?.kind !== 'bytes') {
      showMessage('Unexpected document', 'Orca sent text instead of the file’s bytes.')
      return
    }
    if (doc.content.bytes.byteLength === 0) {
      showMessage('Empty file', 'This file has no bytes, so it is not a Parquet file yet.')
      return
    }
    open(doc.content.bytes.slice(0))
  })
}
