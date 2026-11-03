// Reads a Parquet file held in memory: the footer (schema, row groups, statistics) and rows by
// range. Pure functions over an ArrayBuffer, so the viewer's worker and the tests share them.
import { compressors, parquetMetadata, parquetRead, parquetSchema } from './vendor/hyparquet.mjs'

const num = (value) => (typeof value === 'bigint' ? Number(value) : (value ?? 0))

/** A label for a column's type: the logical type when there is one, else the physical type. */
function typeLabel(element) {
  const logical = element.logical_type
  if (logical) {
    switch (logical.type) {
      case 'DECIMAL':
        return `decimal(${logical.precision}, ${logical.scale})`
      case 'TIMESTAMP':
        return `timestamp[${String(logical.unit).toLowerCase()}${logical.isAdjustedToUTC ? ', UTC' : ''}]`
      case 'TIME':
        return `time[${String(logical.unit).toLowerCase()}]`
      case 'INTEGER':
        return `${logical.isSigned ? 'int' : 'uint'}${logical.bitWidth}`
      case 'STRING':
        return 'string'
      default:
        return String(logical.type).toLowerCase()
    }
  }
  if (element.converted_type) {
    if (element.converted_type === 'DECIMAL') return `decimal(${element.precision}, ${element.scale})`
    if (element.converted_type === 'UTF8') return 'string'
    return element.converted_type.toLowerCase()
  }
  if (element.type === 'BYTE_ARRAY') return 'binary'
  if (element.type === 'FIXED_LEN_BYTE_ARRAY') return `fixed[${element.type_length}]`
  return element.type ? element.type.toLowerCase() : 'group'
}

/** A top-level column's kind, for formatting and default widths. */
function columnKind(tree) {
  const element = tree.element
  if (tree.children.length > 0) {
    const logical = element.logical_type?.type ?? element.converted_type
    if (logical === 'LIST') return 'list'
    if (logical === 'MAP') return 'map'
    return 'struct'
  }
  if (element.repetition_type === 'REPEATED') return 'list'
  const label = typeLabel(element)
  if (/^(u?int|double|float|decimal)/.test(label)) return 'number'
  if (label === 'boolean') return 'boolean'
  if (/^(timestamp|date|time)/.test(label)) return 'time'
  if (label === 'binary' || label.startsWith('fixed')) return 'binary'
  return 'string'
}

function schemaRows(tree, depth = 0, out = []) {
  for (const child of tree.children) {
    const e = child.element
    out.push({
      depth,
      name: e.name,
      type: child.children.length
        ? (e.logical_type?.type ?? e.converted_type ?? (e.repetition_type === 'REPEATED' ? 'repeated group' : 'struct')).toLowerCase()
        : typeLabel(e),
      physical: e.type ?? '',
      repetition: e.repetition_type ?? '',
      fieldId: e.field_id ?? null
    })
    schemaRows(child, depth + 1, out)
  }
  return out
}

function lesser(a, b) {
  if (a === undefined || a === null) return b
  if (b === undefined || b === null) return a
  return a <= b ? a : b
}
function greater(a, b) {
  if (a === undefined || a === null) return b
  if (b === undefined || b === null) return a
  return a >= b ? a : b
}

/** Parses the footer and summarizes it in plain, cloneable values. */
export function openParquet(buffer) {
  const metadata = parquetMetadata(buffer)
  const tree = parquetSchema(metadata)
  const columns = tree.children.map((child) => ({
    name: child.element.name,
    type: child.children.length ? (child.element.logical_type?.type ?? child.element.converted_type ?? 'struct').toLowerCase() : typeLabel(child.element),
    kind: columnKind(child),
    isDate: (child.element.logical_type?.type ?? child.element.converted_type) === 'DATE'
  }))

  // One entry per leaf column chunk path, aggregated over row groups.
  const leaves = new Map()
  for (const group of metadata.row_groups) {
    for (const chunk of group.columns) {
      const meta = chunk.meta_data
      if (!meta) continue
      const key = meta.path_in_schema.join('.')
      const leaf = leaves.get(key) ?? {
        path: key,
        type: meta.type,
        isDate: false,
        codecs: new Set(),
        encodings: new Set(),
        compressed: 0,
        uncompressed: 0,
        values: 0,
        nulls: 0,
        nullsKnown: true,
        min: undefined,
        max: undefined
      }
      leaf.codecs.add(meta.codec)
      for (const encoding of meta.encodings ?? []) leaf.encodings.add(encoding)
      leaf.compressed += num(meta.total_compressed_size)
      leaf.uncompressed += num(meta.total_uncompressed_size)
      leaf.values += num(meta.num_values)
      const stats = meta.statistics
      if (stats?.null_count === undefined) leaf.nullsKnown = false
      else leaf.nulls += num(stats.null_count)
      const min = stats?.min_value ?? stats?.min
      const max = stats?.max_value ?? stats?.max
      if (min !== undefined && typeof min !== 'object') leaf.min = lesser(leaf.min, min)
      else if (min instanceof Date) leaf.min = lesser(leaf.min, min)
      if (max !== undefined && typeof max !== 'object') leaf.max = greater(leaf.max, max)
      else if (max instanceof Date) leaf.max = greater(leaf.max, max)
      leaves.set(key, leaf)
    }
  }

  // Mark DATE leaves, so their statistics read as dates rather than timestamps.
  const dateLeaves = new Set()
  const walk = (node, path) => {
    for (const child of node.children) {
      const next = [...path, child.element.name]
      if (child.children.length) walk(child, next)
      else if ((child.element.logical_type?.type ?? child.element.converted_type) === 'DATE') dateLeaves.add(next.join('.'))
    }
  }
  walk(tree, [])
  for (const [key, leaf] of leaves) leaf.isDate = dateLeaves.has(key)

  let compressed = 0
  let uncompressed = 0
  for (const leaf of leaves.values()) {
    compressed += leaf.compressed
    uncompressed += leaf.uncompressed
  }
  return {
    metadata,
    summary: {
      numRows: num(metadata.num_rows),
      version: metadata.version,
      createdBy: metadata.created_by ?? '',
      fileSize: buffer.byteLength,
      footerSize: metadata.metadata_length,
      compressed,
      uncompressed,
      columns,
      schema: schemaRows(tree),
      rowGroups: metadata.row_groups.map((group, index) => ({
        index,
        rows: num(group.num_rows),
        bytes: num(group.total_compressed_size ?? group.columns.reduce((sum, c) => sum + num(c.meta_data?.total_compressed_size), 0))
      })),
      leaves: [...leaves.values()].map((leaf) => ({
        ...leaf,
        codecs: [...leaf.codecs],
        encodings: [...leaf.encodings],
        nulls: leaf.nullsKnown ? leaf.nulls : null
      })),
      keyValue: (metadata.key_value_metadata ?? []).map((entry) => ({ key: entry.key, value: entry.value ?? '' }))
    }
  }
}

/**
 * Rows [start, end) of `columns` (by index into `summary.columns`), decoded one column at a time
 * and zipped. Without an offset index Parquet readers decode a column's whole row group to return
 * any part of it; one column at a time keeps that to a single column chunk in memory.
 */
export async function readRowsByColumn(buffer, metadata, summary, start, end, columns) {
  const count = end - start
  const rows = Array.from({ length: count }, () => new Array(columns.length))
  for (let c = 0; c < columns.length; c += 1) {
    const values = await readRows(buffer, metadata, start, end, [summary.columns[columns[c]].name])
    for (let r = 0; r < count; r += 1) rows[r][c] = values[r][0]
  }
  return rows
}

/**
 * One column's values for rows [start, end) as a flat array. Delivered column chunk by column
 * chunk, without wrapping each value in a row array: far less garbage than reading rows.
 */
export function readColumnValues(buffer, metadata, start, end, name) {
  const out = new Array(end - start)
  return parquetRead({
    file: buffer,
    metadata,
    compressors,
    utf8: false,
    useOffsetIndex: true,
    columns: [name],
    rowStart: start,
    rowEnd: end,
    // A chunk may reach outside the range asked for; keep only the rows inside it.
    onChunk: ({ columnData, rowStart }) => {
      const from = Math.max(start, rowStart)
      const to = Math.min(end, rowStart + columnData.length)
      for (let row = from; row < to; row += 1) out[row - start] = columnData[row - rowStart]
    }
  }).then(() => out)
}

/** Rows [start, end) as arrays, in the order of `columns` (by name; all columns when omitted). */
export function readRows(buffer, metadata, start, end, columns) {
  return new Promise((resolve, reject) => {
    parquetRead({
      file: buffer,
      metadata,
      compressors,
      // Unlabeled BYTE_ARRAY stays binary; the viewer shows it as text when it is valid UTF-8.
      utf8: false,
      columns,
      // With an offset index, a range decodes only its pages instead of the whole row group.
      useOffsetIndex: true,
      rowStart: start,
      rowEnd: end,
      rowFormat: 'array',
      onComplete: resolve
    }).catch(reject)
  })
}
