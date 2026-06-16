import type { FilterPredicate, NodeValueType, PathPattern, Range } from './types'

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
export const byKey = (...keys: Array<string | number | RegExp>): FilterPredicate =>
  (void keys, TODO('byKey'))

/** Matches when the node's path matches `pattern` (glob string, RegExp, or
 * explicit segment array). */
export const byPath = (pattern: PathPattern): FilterPredicate => (void pattern, TODO('byPath'))

/** Matches when the node's depth is within `range` (root = level 0). */
export const byLevel = (range: Range): FilterPredicate => (void range, TODO('byLevel'))

/** Matches when a collection's child count is within `range`. Leaves (no size)
 * never match. */
export const bySize = (range: Range): FilterPredicate => (void range, TODO('bySize'))

/** Matches when the node's value type is one of `types` (incl. `'object'` /
 * `'array'`). */
export const byType = (...types: NodeValueType[]): FilterPredicate =>
  (void types, TODO('byType'))

/** Matches when the node's value equals one of `values` (RegExp is tested
 * against the stringified value). */
export const byValue = (
  ...values: Array<string | number | boolean | null | RegExp>
): FilterPredicate => (void values, TODO('byValue'))

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
