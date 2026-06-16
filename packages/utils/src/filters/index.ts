import type { FilterPredicate, NodeValueType, PathPattern, Range } from './types'
import { intern } from './_intern'
import { compilePathMatcher } from './_glob'

// Public types. `Range` is intentionally NOT re-exported (see types.ts).
export type { FilterPredicate, NodeValueType, PathPattern } from './types'

// ---------------------------------------------------------------------------
// SCAFFOLD — signatures only. Implemented one at a time (#343, step 3). Each
// throws until built, so the test suite fails loudly rather than passing on a
// stub's accidental return value (no false greens).
// ---------------------------------------------------------------------------
const TODO = (name: string): never => {
  throw new Error(`[@json-edit-react/utils] filters: "${name}" not implemented yet`)
}

// --- Property builders ------------------------------------------------------

/** Matches when the node's own key is one of `keys` (string/number = exact on
 * the stringified key; RegExp = tested against the stringified key). */
export const byKey: (...keys: Array<string | number | RegExp>) => FilterPredicate = intern(
  (...keys: Array<string | number | RegExp>): FilterPredicate => {
    // Split the args once, at builder-call time — not per node.
    const exact = new Set<string>()
    const patterns: RegExp[] = []
    for (const k of keys) {
      if (k instanceof RegExp) patterns.push(k)
      else exact.add(String(k))
    }
    return (node) => {
      const key = String(node.key)
      return exact.has(key) || patterns.some((re) => re.test(key))
    }
  }
)

/** Matches when the node's path matches `pattern` (glob string, RegExp, or
 * explicit segment array). */
export const byPath: (pattern: PathPattern) => FilterPredicate = intern(
  (pattern: PathPattern): FilterPredicate => {
    const matches = compilePathMatcher(pattern) // compiled once per pattern
    return ({ path }) => matches(path)
  }
)

// Shared by byLevel/bySize: resolve a Range to concrete inclusive bounds — a
// bare number means exactly that value; an omitted end becomes ±Infinity, so
// the builders read as a plain `min <= x <= max` with no undefined-checks.
const bounds = (range: Range): { min: number; max: number } =>
  typeof range === 'number'
    ? { min: range, max: range }
    : { min: range.min ?? -Infinity, max: range.max ?? Infinity }

/** Matches when the node's depth is within `range` (root = level 0). */
export const byLevel: (range: Range) => FilterPredicate = intern((range: Range): FilterPredicate => {
  const { min, max } = bounds(range)
  return ({ level }) => level >= min && level <= max
})

/** Matches when a collection's child count is within `range`. Leaves (no size)
 * never match. */
export const bySize: (range: Range) => FilterPredicate = intern((range: Range): FilterPredicate => {
  const { min, max } = bounds(range)
  return ({ size }) => size != null && size >= min && size <= max
})

// The JSON value kind of a node's value, including the two collection types.
const valueType = (value: unknown): NodeValueType => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value as NodeValueType
}

/** Matches when the node's value type is one of `types` (incl. `'object'` /
 * `'array'`). */
export const byType: (...types: NodeValueType[]) => FilterPredicate = intern(
  (...types: NodeValueType[]): FilterPredicate => {
    const set = new Set(types)
    return ({ value }) => set.has(valueType(value))
  }
)

/** Matches when the node's value equals one of `values` (literals = strict
 * equality; RegExp is tested against the stringified value, leaves only). */
export const byValue: (
  ...values: Array<string | number | boolean | null | RegExp>
) => FilterPredicate = intern(
  (...values: Array<string | number | boolean | null | RegExp>): FilterPredicate => {
    const literals = new Set<string | number | boolean | null>()
    const patterns: RegExp[] = []
    for (const v of values) {
      if (v instanceof RegExp) patterns.push(v)
      else literals.add(v)
    }
    return ({ value }) => {
      if (literals.has(value as string | number | boolean | null)) return true
      if (patterns.length === 0) return false
      // A stringified object/array isn't a meaningful pattern target.
      if (value !== null && typeof value === 'object') return false
      return patterns.some((re) => re.test(String(value)))
    }
  }
)

// --- Node-position constants ------------------------------------------------

/** The root node (level 0). */
export const root: FilterPredicate = () => TODO('root')

/** Objects and arrays. */
export const collections: FilterPredicate = () => TODO('collections')

/** Leaf values (everything that isn't a collection). */
export const primitives: FilterPredicate = () => TODO('primitives')

/** Nodes whose parent is an array. */
export const inArray: FilterPredicate = () => TODO('inArray')

/** Nodes whose parent is an object. */
export const inObject: FilterPredicate = () => TODO('inObject')

// --- Combinators ------------------------------------------------------------

/** True when every predicate matches. `and()` (no args) is always true. */
export const and = (...preds: FilterPredicate[]): FilterPredicate => (void preds, TODO('and'))

/** True when any predicate matches. `or()` (no args) is always false. */
export const or = (...preds: FilterPredicate[]): FilterPredicate => (void preds, TODO('or'))

/** Negates a predicate. */
export const not = (pred: FilterPredicate): FilterPredicate => (void pred, TODO('not'))

// --- Search bridges ---------------------------------------------------------

/** Wraps core's `matchNode` / `matchNodeKey` against the current `searchText`.
 * `mode` defaults to `'value'` — the editor's own default `searchFilter`. */
export const matchesSearch = (mode: 'key' | 'value' | 'all' = 'value'): FilterPredicate =>
  (void mode, TODO('matchesSearch'))

/** Reveals a whole record when one of its `fields` values matches `searchText`.
 * `path` (a `byPath` pattern, default `'*'` = top-level items) locates the
 * record layer. */
export const matchRecord = (options: {
  fields: string[]
  path?: PathPattern
}): FilterPredicate => (void options, TODO('matchRecord'))
