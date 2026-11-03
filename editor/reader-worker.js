// Decodes off the UI thread: the viewer sends the file once, then asks for row ranges. A row
// group is decoded once and kept, so the viewer's small requests over it cost a slice each.
import { openParquet, readRows } from './reader.js'

const MAX_CACHED_CELLS = 3_000_000 // a group larger than this is read range by range instead

let file = null
let cached = null // { start, end, rows }

function groupAround(row) {
  let start = 0
  for (const group of file.summary.rowGroups) {
    if (row < start + group.rows) return { start, end: start + group.rows }
    start += group.rows
  }
  return null
}

async function rows(start, end) {
  if (cached && start >= cached.start && end <= cached.end) return cached.rows.slice(start - cached.start, end - cached.start)
  const group = groupAround(start)
  if (group && end <= group.end && (group.end - group.start) * file.summary.columns.length <= MAX_CACHED_CELLS) {
    cached = { ...group, rows: await readRows(file.bytes, file.metadata, group.start, group.end) }
    return cached.rows.slice(start - group.start, end - group.start)
  }
  return readRows(file.bytes, file.metadata, start, end)
}

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'open') {
      const { metadata, summary } = openParquet(data.bytes)
      file = { bytes: data.bytes, metadata, summary, generation: data.generation }
      cached = null
      self.postMessage({ type: 'opened', generation: data.generation, summary })
    } else if (data.type === 'rows') {
      if (!file || file.generation !== data.generation) return
      self.postMessage({ type: 'rows', generation: data.generation, start: data.start, rows: await rows(data.start, data.end) })
    }
  } catch (error) {
    self.postMessage({ type: 'error', generation: data.generation, request: data.type, start: data.start, message: String(error?.message ?? error) })
  }
}
