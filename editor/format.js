// Turns decoded Parquet values into text for cells, the detail pane and exports, and orders them
// for sorting.

const utf8 = new TextDecoder('utf-8', { fatal: true })
const PRINTABLE = /^[^\u0000-\u0008\u000e-\u001f\u007f]*$/

/** Bytes as text when they are printable UTF-8 (older writers store strings unlabeled), else hex. */
export function bytesText(bytes, limit = 48) {
  try {
    const text = utf8.decode(bytes)
    if (PRINTABLE.test(text)) return { text, isText: true }
  } catch {
    // Not UTF-8: hex below.
  }
  let hex = ''
  for (let i = 0; i < Math.min(bytes.length, limit); i += 1) hex += bytes[i].toString(16).padStart(2, '0')
  return { text: `0x${hex}${bytes.length > limit ? '…' : ''}`, isText: false }
}

/** Dates as YYYY-MM-DD; timestamps always with their time, so a midnight value reads as one. */
function isoDate(date, dateOnly) {
  if (Number.isNaN(date.getTime())) return 'Invalid date'
  const iso = date.toISOString()
  return dateOnly ? iso.slice(0, 10) : iso.replace('T', ' ').replace(/\.000Z$/, 'Z')
}

/** JSON that keeps BigInt, bytes and dates readable. */
export function toJson(value, space) {
  return JSON.stringify(
    value,
    function replace(key, item) {
      const raw = this[key]
      if (typeof raw === 'bigint') return Number.isSafeInteger(Number(raw)) ? Number(raw) : raw.toString()
      if (raw instanceof Date) return isoDate(raw, false)
      if (raw instanceof Uint8Array) return bytesText(raw, 1 << 20).text
      return item
    },
    space
  )
}

/**
 * The text shown in a cell.
 * @param {any} value
 * @param {{ kind?: string, isDate?: boolean }} [column]
 */
export function cellText(value, column = {}) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(12)))
  if (typeof value === 'bigint' || typeof value === 'boolean') return String(value)
  if (value instanceof Date) return isoDate(value, column.isDate)
  if (value instanceof Uint8Array) return bytesText(value).text
  return toJson(value)
}

/** The full value, for the detail pane: pretty JSON for nested values. */
export function detailText(value, column = {}) {
  if (value === null || value === undefined) return 'null'
  if (value instanceof Uint8Array) {
    const { text, isText } = bytesText(value, 4096)
    return isText ? text : `${value.length} bytes\n${text}`
  }
  if (typeof value === 'object' && !(value instanceof Date)) return toJson(value, 2)
  return cellText(value, column)
}

const rank = (value) => {
  if (value === null || value === undefined) return 3
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean' || value instanceof Date) return 0
  if (typeof value === 'string') return 1
  return 2
}
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/** Orders two values of one column; nulls sort last either way (the caller flips only the rest). */
export function compareValues(a, b) {
  const ra = rank(a)
  const rb = rank(b)
  if (ra !== rb) return ra - rb
  if (ra === 0) {
    const x = a instanceof Date ? a.getTime() : typeof a === 'boolean' ? Number(a) : a
    const y = b instanceof Date ? b.getTime() : typeof b === 'boolean' ? Number(b) : b
    return x < y ? -1 : x > y ? 1 : 0
  }
  if (ra === 1) return collator.compare(a, b)
  if (ra === 2) return collator.compare(cellText(a) ?? '', cellText(b) ?? '')
  return 0
}

export const isNull = (value) => value === null || value === undefined

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[unit]}`
}

/** One CSV field: quoted when it holds a separator, quote or line break. */
export function csvField(value, column) {
  const text = isNull(value) ? '' : (cellText(value, column) ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}
