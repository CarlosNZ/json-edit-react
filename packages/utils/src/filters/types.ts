import type { JsonData, NodeData } from 'json-edit-react'

/**
 * The single predicate type the whole kit produces and consumes. The optional
 * second argument is the load-bearing detail: a predicate of this shape is
 * assignable to BOTH `FilterFunction` (the `allow*` props, called with one arg)
 * and `SearchFilterFunction` (`searchFilter`, called with two), so one set of
 * builders serves every filter prop with no search-specific variants.
 */
export type FilterPredicate<T = JsonData> = (node: NodeData<T>, searchText?: string) => boolean

/** The JSON value kinds `byType` understands, including the two collections. */
export type NodeValueType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array'

/**
 * How a path is matched: a glob string (`'users.*.email'`), a RegExp tested
 * against the stringified path, or an explicit segment array — the escape hatch
 * for keys containing a literal `.`.
 */
export type PathPattern = string | RegExp | Array<string | number>

/**
 * A numeric range for `byLevel`/`bySize`. A bare number means "exactly this";
 * the object form bounds one or both ends inclusively, an omitted end being
 * unbounded. Kept internal rather than re-exported, since `Range` is also a DOM
 * global and doesn't belong on the package's public surface.
 */
export type Range = number | { min?: number; max?: number }
