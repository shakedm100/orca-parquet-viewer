// Arrow JS values -> the values hyparquet produces, so the viewer formats both the same way.
import { Type } from "./vendor/arrow.mjs"

export function toJs(value, type) {
  if (value === null || value === undefined) return null
  switch (type.typeId) {
    case Type.Timestamp:
    case Type.Date:
      return new Date(Number(value))
    case Type.Decimal: {
      // An unscaled integer; hyparquet returns decimals as numbers.
      const unscaled = BigInt(String(value))
      return Number(unscaled) / 10 ** type.scale
    }
    case Type.Binary:
    case Type.LargeBinary:
    case Type.FixedSizeBinary:
      return value.slice() // a view into a shared buffer: copy just these bytes
    case Type.List:
    case Type.LargeList:
    case Type.FixedSizeList: {
      const child = type.children[0].type
      const out = new Array(value.length)
      for (let i = 0; i < value.length; i += 1) out[i] = toJs(value.get(i), child)
      return out
    }
    case Type.Struct: {
      const out = {}
      for (const field of type.children) out[field.name] = toJs(value[field.name], field.type)
      return out
    }
    case Type.Map: {
      const out = {}
      const valueType = type.children[0].type.children[1].type
      for (const [key, item] of value) out[String(key)] = toJs(item, valueType)
      return out
    }
    case Type.Dictionary:
      return toJs(value, type.dictionary)
    default:
      return value
  }
}
