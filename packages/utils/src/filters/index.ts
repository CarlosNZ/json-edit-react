import { extract, matchNode, matchNodeKey, type JsonData } from 'json-edit-react'
import type { FilterPredicate, NodeValueType, PathPattern, Range } from './types'
import { intern } from '../_common/intern'
import { internRef, internRefs } from './_intern'
import { compilePathMatcher } from './_glob'

// Public types. `Range` is intentionally NOT re-exported (see types.ts).
export type { FilterPredicate, NodeValueType, PathPattern } from './types'

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

// A value is a collection (object or array) iff it's a non-null object — the
// same test the editor uses to split collection nodes from leaves.
const isCollectionValue = (value: unknown): boolean => value !== null && typeof value === 'object'

/** The root node (level 0). */
export const root: FilterPredicate = ({ level }) => level === 0

/** Objects and arrays. */
export const collections: FilterPredicate = ({ value }) => isCollectionValue(value)

/** Leaf values (everything that isn't a collection). */
export const primitives: FilterPredicate = ({ value }) => !isCollectionValue(value)

/** Nodes whose parent is an array. */
export const inArray: FilterPredicate = ({ parentData }) => Array.isArray(parentData)

/** Nodes whose parent is an object (not an array; the root has no parent). */
export const inObject: FilterPredicate = ({ parentData }) =>
  isCollectionValue(parentData) && !Array.isArray(parentData)

// --- Combinators ------------------------------------------------------------

// Identity elements for the empty combinator calls — module-level singletons,
// so `and()` / `or()` are referentially stable too.
const alwaysTrue: FilterPredicate = () => true
const alwaysFalse: FilterPredicate = () => false

/** True when every predicate matches. `and()` (no args) is always true. */
export const and: (...preds: FilterPredicate[]) => FilterPredicate = internRefs(
  (preds) => (node, searchText) => preds.every((p) => p(node, searchText)),
  alwaysTrue
)

/** True when any predicate matches. `or()` (no args) is always false. */
export const or: (...preds: FilterPredicate[]) => FilterPredicate = internRefs(
  (preds) => (node, searchText) => preds.some((p) => p(node, searchText)),
  alwaysFalse
)

/** Negates a predicate. */
export const not: (pred: FilterPredicate) => FilterPredicate = internRef(
  (pred) => (node, searchText) => !pred(node, searchText)
)

// --- Search bridges ---------------------------------------------------------

/** Matches against the current `searchText` using core's own matchers:
 * `'value'` (the default — node values), `'key'` (keys + path segments), or
 * `'all'` (either). `searchText` is threaded in by the editor / a combinator. */
export const matchesSearch: (mode?: 'key' | 'value' | 'all') => FilterPredicate = intern(
  (mode: 'key' | 'value' | 'all' = 'value'): FilterPredicate => {
    if (mode === 'key') return (node, searchText = '') => matchNodeKey(node, searchText)
    if (mode === 'all')
      return (node, searchText = '') =>
        matchNode(node, searchText) || matchNodeKey(node, searchText)
    return (node, searchText = '') => matchNode(node, searchText)
  }
)

/** Reveals a whole record when one of its `fields` values matches `searchText`.
 * `path` (a `byPath` pattern, default `'*'` = top-level items) locates the
 * record layer: a node belongs to the SHORTEST prefix of its path that matches
 * `path`. Pin a layer with the pattern — avoid `**` for the record path. */
export const matchRecord: (options: { fields: string[]; path?: PathPattern }) => FilterPredicate =
  intern((options: { fields: string[]; path?: PathPattern }): FilterPredicate => {
    const { fields, path = '*' } = options
    const isRecordPath = compilePathMatcher(path)
    return ({ path: nodePath, fullData }, searchText = '') => {
      for (let len = 0; len <= nodePath.length; len++) {
        const prefix = nodePath.slice(0, len)
        if (!isRecordPath(prefix)) continue
        // The prefix is always a valid slice of this node's path, so extract
        // resolves it without hitting its throw-on-missing branch.
        const record: unknown = extract(fullData, prefix)
        if (record === null || typeof record !== 'object') return false
        const rec = record as Record<string, unknown>
        return fields.some((f) => matchNode({ value: rec[f] as JsonData }, searchText))
      }
      return false // the node sits above the record layer
    }
  })
