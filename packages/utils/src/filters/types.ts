import type { JsonData, NodeData } from 'json-edit-react'

/**
 * The single predicate type the whole kit produces and consumes. The second
 * argument is OPTIONAL — that's the load-bearing detail: a predicate of this
 * shape is assignable to BOTH `FilterFunction` (the `allow*` props, called with
 * one arg) AND `SearchFilterFunction` (`searchFilter`, called with two). One
 * set of builders therefore serves every filter prop with no search-specific
 * variants. (See the design discussion on #343.)
 */
export type FilterPredicate<T = JsonData> = (node: NodeData<T>, searchText?: string) => boolean

/** The JSON value kinds `byType` understands, including the two collections. */
export type NodeValueType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array'

/**
 * How a path is matched: a glob string (`'users.*.email'`), a RegExp tested
 * against the stringified path, or an explicit segment array — the escape hatch
 * for keys that contain a literal `.`.
 */
export type PathPattern = string | RegExp | Array<string | number>

/**
 * A numeric range for `byLevel` / `bySize`. A bare number means "exactly this";
 * the object form bounds one or both ends (an omitted end is unbounded). Bounds
 * are inclusive. Kept internal (not re-exported) — `Range` is also a DOM global,
 * so we don't want it on the package's public surface.
 */
export type Range = number | { min?: number; max?: number }
