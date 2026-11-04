// Text search over Arrow data decoded by parquet-wasm: strings are matched as UTF-8 bytes where
// they lie, so no JavaScript string is created per value. Lists, structs, maps and dictionaries
// are walked through their child arrays.
import initWasm, { ParquetFile } from './vendor/parquet-wasm/parquet_wasm.js'
import { tableFromIPC, Type } from './vendor/arrow.mjs'

let ready = null
export function loadWasm() {
  ready ??= initWasm({ module_or_path: new URL('./vendor/parquet-wasm/parquet_wasm_bg.wasm', import.meta.url) })
  return ready
}

const TEXT_TYPES = new Set([Type.Utf8, Type.LargeUtf8, Type.Binary, Type.LargeBinary])
const lowerByte = (b) => (b >= 65 && b <= 90 ? b + 32 : b)

/** A matcher for ASCII-case-insensitive search; non-ASCII bytes compare exactly. */
function byteMatcher(term) {
  const needle = new TextEncoder().encode(term.toLowerCase())
  const first = needle[0]
  const firstUpper = first >= 97 && first <= 122 ? first - 32 : first
  return (offsets, values, start, length, out) => {
    for (let i = 0; i < length; i += 1) {
      const from = Number(offsets[start + i])
      const to = Number(offsets[start + i + 1]) - needle.length
      for (let p = from; p <= to; p += 1) {
        const b = values[p]
        if (b !== first && b !== firstUpper) continue
        let k = 1
        while (k < needle.length && lowerByte(values[p + k]) === needle[k]) k += 1
        if (k === needle.length) {
          out[i] = 1
          break
        }
      }
    }
  }
}

/** Whether Arrow can search this column's bytes; numbers and dates stay with the JS path. */
export function isTextual(type) {
  const id = type.typeId
  if (TEXT_TYPES.has(id)) return true
  if (id === Type.Dictionary) return isTextual(type.dictionary)
  if (id === Type.List || id === Type.LargeList || id === Type.FixedSizeList || id === Type.Map) return isTextual(type.children[0].type)
  if (id === Type.Struct) return type.children.some((child) => isTextual(child.type))
  return false
}

function matchData(data, matchBytes) {
  const n = data.length
  const id = data.type.typeId
  let out = null
  if (TEXT_TYPES.has(id)) {
    out = new Uint8Array(n)
    matchBytes(data.valueOffsets, data.values, data.offset, n, out)
  } else if (id === Type.Dictionary) {
    const dictionary = matchData(data.dictionary.data[0], matchBytes)
    if (!dictionary) return null
    out = new Uint8Array(n)
    for (let i = 0; i < n; i += 1) out[i] = dictionary[data.values[data.offset + i]]
  } else if (id === Type.List || id === Type.LargeList || id === Type.Map) {
    const child = matchData(data.children[0], matchBytes)
    if (!child) return null
    out = new Uint8Array(n)
    const offsets = data.valueOffsets
    for (let i = 0; i < n; i += 1) {
      for (let j = Number(offsets[data.offset + i]); j < Number(offsets[data.offset + i + 1]); j += 1) {
        if (child[j]) {
          out[i] = 1
          break
        }
      }
    }
  } else if (id === Type.Struct) {
    for (const childData of data.children) {
      const child = matchData(childData, matchBytes)
      if (!child) continue
      out ??= new Uint8Array(n)
      for (let i = 0; i < n; i += 1) out[i] |= child[data.offset + i]
    }
  }
  if (out && data.nullBitmap && data.nullCount > 0) {
    for (let i = 0; i < n; i += 1) {
      const bit = data.offset + i
      if (!((data.nullBitmap[bit >> 3] >> (bit & 7)) & 1)) out[i] = 0
    }
  }
  return out
}

/** Opens the file for Arrow reads; `columns` is the subset Arrow can search. */
export async function openArrowSearch(bytes, names) {
  await loadWasm()
  const file = await ParquetFile.fromFile(new Blob([bytes]))
  const schema = tableFromIPC(file.schema().intoIPCStream()).schema
  const textual = new Set(schema.fields.filter((field) => names.includes(field.name) && isTextual(field.type)).map((field) => field.name))
  return {
    textual,
    /** Sets mask[row] for matching rows of column `name` in row group `group` (first row `start`). */
    async searchGroup(group, start, name, term, mask) {
      const table = tableFromIPC((await file.read({ rowGroups: [group], columns: [name] })).intoIPCStream())
      const matchBytes = byteMatcher(term)
      let row = start
      let found = 0
      for (const batch of table.batches) {
        const data = batch.getChild(name).data[0]
        const hits = matchData(data, matchBytes)
        if (hits) {
          for (let i = 0; i < hits.length; i += 1) {
            if (hits[i] && !mask[row + i]) {
              mask[row + i] = 1
              found += 1
            }
          }
        }
        row += data.length
      }
      return found
    },
    free() {
      file.free()
    }
  }
}

/**
 * Reads rows for display from Arrow data: a window is decoded once into compact Arrow buffers
 * and kept, and only the rows asked for become JavaScript values.
 */
export async function openArrowRows(bytes, summary) {
  await loadWasm()
  const { toJs } = await import('./arrow-values.js')
  const file = await ParquetFile.fromFile(new Blob([bytes]))
  const names = summary.columns.map((column) => column.name)
  let window = null // { start, end, vectors, types }
  return {
    covers: (start, end) => window !== null && start >= window.start && end <= window.end,
    async load(start, end) {
      const table = tableFromIPC((await file.read({ offset: start, limit: end - start, columns: names })).intoIPCStream())
      window = {
        start,
        end: start + table.numRows,
        vectors: names.map((name) => table.getChild(name)),
        types: names.map((name) => table.schema.fields.find((field) => field.name === name).type)
      }
    },
    rows(start, end) {
      const out = new Array(end - start)
      for (let r = start; r < end; r += 1) {
        const i = r - window.start
        out[r - start] = window.vectors.map((vector, c) => toJs(vector.get(i), window.types[c]))
      }
      return out
    }
  }
}

const NUMERIC_TYPES = new Set([Type.Int, Type.Float, Type.Timestamp, Type.Date, Type.Bool, Type.Time])

/**
 * Sort keys for a numeric, temporal or boolean column as one typed array (no object per row),
 * plus a byte per row marking nulls; null when the column is not of such a type.
 */
export async function arrowSortKeys(bytes, summary, col) {
  await loadWasm()
  const file = await ParquetFile.fromFile(new Blob([bytes]))
  try {
    const name = summary.columns[col].name
    const field = tableFromIPC(file.schema().intoIPCStream()).schema.fields.find((f) => f.name === name)
    if (!field || !NUMERIC_TYPES.has(field.type.typeId)) return null
    const wide = field.type.typeId === Type.Int && field.type.bitWidth === 64
    const keys = wide ? new BigInt64Array(summary.numRows) : new Float64Array(summary.numRows)
    const isNull = new Uint8Array(summary.numRows)
    let row = 0
    for (let group = 0; group < summary.rowGroups.length; group += 1) {
      const table = tableFromIPC((await file.read({ rowGroups: [group], columns: [name] })).intoIPCStream())
      for (const batch of table.batches) {
        const data = batch.getChild(name).data[0]
        const values = data.values
        for (let i = 0; i < data.length; i += 1) {
          const bit = data.offset + i
          if (data.nullCount > 0 && data.nullBitmap && !((data.nullBitmap[bit >> 3] >> (bit & 7)) & 1)) {
            isNull[row + i] = 1
            continue
          }
          if (field.type.typeId === Type.Bool) keys[row + i] = (values[bit >> 3] >> (bit & 7)) & 1
          else if (wide) keys[row + i] = BigInt.asIntN(64, BigInt(values[data.offset + i]))
          else keys[row + i] = Number(values[data.offset + i])
        }
        row += data.length
      }
    }
    return { keys, isNull }
  } finally {
    file.free()
  }
}
