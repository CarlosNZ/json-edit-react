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

// Wrap a value in an array unless it already is one, for the "accepts one or
// many" inputs: theme layers, collapse states, keyboard modifiers.
export const toArray = <T>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value])

export const isCollection = (value: unknown): value is Record<string, unknown> | unknown[] =>
  value !== null && typeof value === 'object'

export const isObject = (input: unknown): input is Record<string, unknown> =>
  typeof input === 'object' && input !== null && !Array.isArray(input)

// Distinguishes a Promise (or any thenable) from a synchronous value, so the
// commit engine can resolve a synchronous `onUpdate` verdict in place, with no
// optimistic apply.
export const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  value != null &&
  (typeof value === 'object' || typeof value === 'function') &&
  typeof (value as { then?: unknown }).then === 'function'

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

// Matches the current (string) data value against the possible data types,
// returning the highest-priority matching enum type.
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

// A `JSON.parse` reviver handles the other non-serialisable types, but not
// `undefined`: returning `undefined` from a reviver throws the whole property
// away. So the serialised "__undefined__" sentinel survives the parse, and this
// post-processes the result to put real `undefined` values back.
export const restoreUndefined = (val: unknown): unknown => {
  if (val === UNDEFINED) return undefined
  if (val && typeof val === 'object') {
    // Arrays and objects alike are mutated in place: the input is always
    // freshly produced by `jsonParse`, so there's no shared reference to
    // corrupt. The change guard means an undefined-free tree does zero writes.
    for (const key in val) {
      const original = (val as Record<string, unknown>)[key]
      const restored = restoreUndefined(original)
      if (restored !== original) (val as Record<string, unknown>)[key] = restored
    }
  }
  return val
}

// The hidden char distinguishes this from the literal string "__undefined__"
export const UNDEFINED = '__\u200Bundefined__'
