import {
  type CollectionData,
  type EnumDefinition,
  type TypeOptions,
  type ValueData,
} from '../types'

/**
 * GENERAL
 */

export const NOOP = () => {}

// Wrap a value in an array unless it already is one — for the "accepts one or
// many" inputs (theme layers, collapse states, keyboard modifiers).
export const toArray = <T>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value])

export const isCollection = (value: unknown): value is Record<string, unknown> | unknown[] =>
  value !== null && typeof value === 'object'

export const isObject = (input: unknown): input is Record<string, unknown> =>
  typeof input === 'object' && input !== null && !Array.isArray(input)

export const isJsEvent = (value: unknown) => {
  return (
    value &&
    typeof value === 'object' &&
    'type' in value &&
    'target' in value &&
    'preventDefault' in value &&
    typeof value.preventDefault === 'function'
  )
}

/**
 * JSON VALUE HANDLING
 */

// Compares the current (string) data value against the possible data types to
// see if it matches any Enum types, and returns the highest priority match if
// so.
export const matchEnumType = (
  value: CollectionData | ValueData,
  dataTypes: TypeOptions
): EnumDefinition | null => {
  if (typeof value !== 'string') return null

  const candidates = dataTypes.filter(
    (type) =>
      type instanceof Object && type.enum && type.values.includes(value) && type.matchPriority
  ) as EnumDefinition[]
  candidates.sort((a, b) => (b.matchPriority ?? 0) - (a.matchPriority ?? 0))
  return candidates[0] ?? null
}

// When running JSON.parse, a standard "reviver" function, which we can use for
// other non-serializable types, doesn't work for `undefined` (it throws the
// whole property away if the reviver returns `undefined`). So we leave it as
// the serialized "__undefined__" (created in stringify method), and the
// post-process the parsed data here to replace these with actual `undefined`
// values
export const restoreUndefined = (val: unknown): unknown => {
  if (val === UNDEFINED) return undefined
  if (val && typeof val === 'object') {
    // Arrays and objects both: mutate in place. The input is always
    // freshly produced by jsonParse, so there's no shared reference to
    // corrupt. The change guard means an undefined-free tree does zero
    // writes — only a genuine sentinel triggers a mutation.
    for (const key in val) {
      const original = (val as Record<string, unknown>)[key]
      const restored = restoreUndefined(original)
      if (restored !== original) (val as Record<string, unknown>)[key] = restored
    }
  }
  return val
}

// Note additional hidden char included to distinguish it from actual string
// value "__undefined__"
export const UNDEFINED = '__\u200Bundefined__'
