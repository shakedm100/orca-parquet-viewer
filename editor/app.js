// Parquet viewer: reads the file Orca hands this editor (its bytes), decodes it in a worker and
// shows the rows in a grid that draws only what is on screen, plus the schema and file details.
import { cellText, compareValues, csvField, detailText, formatBytes, isNull, toJson } from './format.js'

const CHUNK = 2000 // rows per worker request
const CELL_BUDGET = 4_000_000 // cells kept in memory; past it, rows load as you scroll to them
const ROW = 26
const HEAD = 40
const OVERSCAN = 6

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
  rows: [], // sparse: physical row -> array of values
  loaded: new Set(), // chunk numbers held in `rows`
  pending: new Set(),
  inFlight: null,
  budgetRows: 0,
  view: null, // Int32Array of physical rows when sorted or filtered, else null
  sort: null, // { col, dir: 1 | -1 }
  filter: '',
  selected: null, // { row (view index), col (index into columns) }
  gutterWidth: 60,
  offsets: [] // x of each visible column
}

const worker = new Worker(new URL('./reader-worker.js', import.meta.url), { type: 'module' })

// ------------------------------------------------------------------ loading

function showMessage(title, text = '') {
  els.message.hidden = false
  els.message.querySelector('.title').textContent = title
  els.message.querySelector('.muted').textContent = text
}

function open(bytes) {
  state.generation += 1
  Object.assign(state, { summary: null, rows: [], loaded: new Set(), pending: new Set(), inFlight: null, view: null, selected: null })
  els.detail.hidden = true
  els.status.textContent = `Reading ${formatBytes(bytes.byteLength)}…`
  worker.postMessage({ type: 'open', bytes, generation: state.generation }, [bytes])
}

worker.onmessage = ({ data }) => {
  if (data.generation !== state.generation) return
  if (data.type === 'opened') onOpened(data.summary)
  else if (data.type === 'rows') onRows(data.start, data.rows)
  else if (data.type === 'error') {
    if (data.request === 'open') showMessage('This file could not be read as Parquet', data.message)
    else {
      els.viewNote.textContent = `Rows from ${data.start.toLocaleString()} could not be read: ${data.message}`
      state.inFlight = null
      pump()
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
  state.budgetRows = Math.max(CHUNK, Math.floor(CELL_BUDGET / Math.max(1, summary.columns.length)))
  state.gutterWidth = Math.max(48, String(summary.numRows).length * 8 + 22)
  els.message.hidden = true
  renderSchema()
  renderInfo()
  renderColumnsMenu()
  if (state.filter || state.sort) rebuildView()
  layout()
  updateStatus()
  pump()
}

function onRows(start, rows) {
  const chunk = start / CHUNK
  for (let i = 0; i < rows.length; i += 1) state.rows[start + i] = rows[i]
  state.loaded.add(chunk)
  state.pending.delete(chunk)
  state.inFlight = null
  // Past the memory budget, drop the chunks farthest from what is on screen.
  if (state.loaded.size * CHUNK > state.budgetRows) evict()
  if (state.view !== null) scheduleRebuild()
  render()
  updateStatus()
  pump()
}

function visibleChunks() {
  const first = Math.max(0, Math.floor((els.grid.scrollTop) / ROW) - OVERSCAN)
  const last = Math.min(viewLength() - 1, Math.ceil((els.grid.scrollTop + els.grid.clientHeight) / ROW) + OVERSCAN)
  const chunks = new Set()
  for (let i = first; i <= last; i += 1) chunks.add(Math.floor(physicalRow(i) / CHUNK))
  return chunks
}

function evict() {
  const keep = visibleChunks()
  const center = [...keep][0] ?? 0
  const victims = [...state.loaded].filter((chunk) => !keep.has(chunk)).sort((a, b) => Math.abs(b - center) - Math.abs(a - center))
  while (state.loaded.size * CHUNK > state.budgetRows && victims.length) {
    const chunk = victims.shift()
    state.loaded.delete(chunk)
    for (let i = chunk * CHUNK; i < (chunk + 1) * CHUNK; i += 1) delete state.rows[i]
  }
}

/** Asks the worker for the next chunk: what is on screen first, then the rest in order while it fits. */
function pump() {
  if (!state.summary || state.inFlight !== null) return
  const total = Math.ceil(state.summary.numRows / CHUNK)
  let next = null
  for (const chunk of visibleChunks()) {
    if (!state.loaded.has(chunk)) {
      next = chunk
      break
    }
  }
  if (next === null && state.loaded.size * CHUNK < state.budgetRows) {
    for (let chunk = 0; chunk < total; chunk += 1) {
      if (!state.loaded.has(chunk)) {
        next = chunk
        break
      }
    }
  }
  if (next === null || next >= total) return
  state.inFlight = next
  state.pending.add(next)
  const start = next * CHUNK
  worker.postMessage({ type: 'rows', generation: state.generation, start, end: Math.min(state.summary.numRows, start + CHUNK) })
}

const allLoaded = () => state.summary && state.loaded.size >= Math.ceil(state.summary.numRows / CHUNK)
const loadedRows = () => (state.summary ? Math.min(state.summary.numRows, state.loaded.size * CHUNK) : 0)

// ------------------------------------------------------------------ sort and filter

const viewLength = () => (state.view ? state.view.length : (state.summary?.numRows ?? 0))
const physicalRow = (index) => (state.view ? state.view[index] : index)

let rebuildTimer = 0
function scheduleRebuild() {
  clearTimeout(rebuildTimer)
  rebuildTimer = setTimeout(() => {
    rebuildView()
    render()
    updateStatus()
  }, 250)
}

/** Sort and filter run over the rows in memory; a note says so when that is not all of them. */
function rebuildView() {
  if (!state.summary || (!state.filter && !state.sort)) {
    state.view = null
    return
  }
  const indices = []
  const term = state.filter.toLowerCase()
  const shown = state.columns.map((column, i) => [column, i]).filter(([column]) => !column.hidden)
  for (const chunk of [...state.loaded].sort((a, b) => a - b)) {
    const end = Math.min(state.summary.numRows, (chunk + 1) * CHUNK)
    for (let row = chunk * CHUNK; row < end; row += 1) {
      const values = state.rows[row]
      if (!values) continue
      if (term) {
        let hit = false
        for (const [column, i] of shown) {
          const text = cellText(values[i], column)
          if (text !== null && text.toLowerCase().includes(term)) {
            hit = true
            break
          }
        }
        if (!hit) continue
      }
      indices.push(row)
    }
  }
  if (state.sort) {
    const { col, dir } = state.sort
    indices.sort((a, b) => {
      const x = state.rows[a][col]
      const y = state.rows[b][col]
      if (isNull(x) || isNull(y)) return compareValues(x, y) || a - b // nulls last both ways
      return dir * compareValues(x, y) || a - b
    })
  }
  state.view = Int32Array.from(indices)
}

let filterTimer = 0
els.search.addEventListener('input', () => {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    state.filter = els.search.value.trim()
    state.selected = null
    els.detail.hidden = true
    rebuildView()
    els.grid.scrollTop = 0
    layout()
    updateStatus()
    pump()
  }, 200)
})

function toggleSort(col) {
  if (!state.sort || state.sort.col !== col) state.sort = { col, dir: 1 }
  else if (state.sort.dir === 1) state.sort = { col, dir: -1 }
  else state.sort = null
  rebuildView()
  layout()
  updateStatus()
  pump()
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
    const values = state.rows[row]
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
  if (visibleChunks().size && [...visibleChunks()].some((chunk) => !state.loaded.has(chunk))) pump()
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
    const text = state.rows[physicalRow(i)] ? cellText(state.rows[physicalRow(i)][index], column) : ''
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
  const values = state.rows[physicalRow(state.selected.row)]
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
  if (state.filter) rebuildView()
  layout()
  updateStatus()
}

// ------------------------------------------------------------------ export

els.exportMenu.addEventListener('click', async (event) => {
  const format = event.target.closest('[data-format]')?.dataset.format
  if (!format) return
  closeMenus()
  if (!orca.files?.saveAs) {
    els.viewNote.textContent = 'Saving needs the Orca desktop app.'
    return
  }
  const shown = state.columns.map((column, i) => [column, i]).filter(([column]) => !column.hidden)
  const parts = []
  if (format === 'csv') parts.push(shown.map(([column]) => csvField(column.name, {})).join(','), '\n')
  if (format === 'json') parts.push('[\n')
  let count = 0
  let size = 0
  const total = viewLength()
  for (let i = 0; i < total; i += 1) {
    const values = state.rows[physicalRow(i)]
    if (!values) continue
    let line
    if (format === 'csv') line = `${shown.map(([column, j]) => csvField(values[j], column)).join(',')}\n`
    else {
      const object = Object.fromEntries(shown.map(([column, j]) => [column.name, values[j]]))
      line = format === 'json' ? `${count ? ',\n' : ''}  ${toJson(object)}` : `${toJson(object)}\n`
    }
    size += line.length
    if (size > 60 * 1024 * 1024) {
      els.viewNote.textContent = 'Export stopped at 60 MB, Orca’s limit for a saved file. Filter or hide columns to export less.'
      break
    }
    parts.push(line)
    count += 1
  }
  if (format === 'json') parts.push('\n]\n')
  const name = `${state.view ? 'rows-shown' : 'rows'}.${format}`
  try {
    const { status } = await orca.files.saveAs({
      suggestedName: name,
      mimeType: format === 'csv' ? 'text/csv' : 'application/json',
      data: parts.join('')
    })
    if (status === 'saved') els.viewNote.textContent = `Saved ${count.toLocaleString()} rows.`
  } catch (error) {
    els.viewNote.textContent = `Could not save: ${error.message}`
  }
})

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

function updateStatus() {
  const s = state.summary
  if (!s) return
  const shown = state.columns.filter((column) => !column.hidden).length
  const columns = shown === s.columns.length ? `${s.columns.length} columns` : `${shown} of ${s.columns.length} columns`
  let text = `${s.numRows.toLocaleString()} rows, ${columns}`
  if (state.view && state.filter) text = `${state.view.length.toLocaleString()} of ${s.numRows.toLocaleString()} rows match, ${columns}`
  els.status.textContent = text
  const notes = []
  if (!allLoaded()) {
    const inMemory = loadedRows()
    if (state.view) notes.push(`Sorting and filtering cover the ${inMemory.toLocaleString()} rows loaded so far`)
    else if (state.inFlight !== null && inMemory < state.budgetRows) notes.push(`Loading ${inMemory.toLocaleString()} of ${s.numRows.toLocaleString()}…`)
    else if (inMemory >= state.budgetRows) notes.push('Large file: rows load as you scroll')
  }
  if (state.sort) notes.push(`sorted by ${state.columns[state.sort.col].name} ${state.sort.dir === 1 ? 'ascending' : 'descending'}`)
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
