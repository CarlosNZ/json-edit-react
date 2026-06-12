/**
 * Filter-state slice: surfaces the pre-computed `{ visiblePaths,
 * visibleChildCounts }` from `JsonEditor` to every node, so per-node
 * visibility/count is an O(1) Set/Map lookup instead of the per-node
 * subtree walk the old `filterNode` did.
 *
 * Four consumer hooks:
 *
 *   useFilterActive()           — boolean: "is search active right now?"
 *                                 Drives the n-of-m branch (no point
 *                                 saying "5 of 5" when nothing's filtered).
 *
 *   useNodeVisible(path)        — boolean: "should this node render?"
 *                                 Replaces both per-node `filterNode`
 *                                 calls. Returns `true` when no filter
 *                                 is active.
 *
 *   useVisibleChildCount(path)  — number | null: visible direct children
 *                                 of this collection. `null` when no
 *                                 filter is active (caller falls back to
 *                                 `nodeData.size`).
 *
 *   useRawFilterState()         — FilterState | null: the whole pre-
 *                                 computed bundle. For callers that need
 *                                 to check many candidate paths from a
 *                                 closure (e.g. the Tab-viability
 *                                 predicate in ValueNodeWrapper, where
 *                                 hooks-per-candidate would violate the
 *                                 rules of hooks).
 *
 * Pattern note: this is a dumb provider — `JsonEditor` owns the
 * `useMemo` that builds the state, and passes it as a `value` prop.
 * Keeps the algorithm out of React-land for testability (see
 * `computeFilterState` in `utils/filter.ts`) and means the context
 * value's identity is stable between search keystrokes (only changes
 * when `(data, searchText, searchFilter)` change), so the §16 memo
 * invariants hold for everything below.
 */

import React, { createContext, useContext } from 'react'
import { type CollectionKey } from '../types'
import { type FilterState } from '../utils/filter'
import { toPathString } from '../utils/pathTools'

// `null` value = no filter active. Distinct from `undefined` (= provider
// missing); we throw on `undefined` in the hooks so a misuse outside the
// editor surfaces loudly instead of silently returning "visible".
const FilterStateContext = createContext<FilterState | null | undefined>(undefined)

interface FilterStateProps {
  value: FilterState | null
  children: React.ReactNode
}

export const FilterStateProvider = ({ value, children }: FilterStateProps) => (
  <FilterStateContext.Provider value={value}>{children}</FilterStateContext.Provider>
)

const useFilterStateContext = (): FilterState | null => {
  const ctx = useContext(FilterStateContext)
  if (ctx === undefined) throw new Error('Missing FilterStateProvider')
  return ctx
}

export const useFilterActive = (): boolean => useFilterStateContext() !== null

export const useRawFilterState = (): FilterState | null => useFilterStateContext()

export const useNodeVisible = (path: CollectionKey[]): boolean => {
  const fs = useFilterStateContext()
  if (fs === null) return true
  return fs.visiblePaths.has(toPathString(path))
}

export const useVisibleChildCount = (path: CollectionKey[]): number | null => {
  const fs = useFilterStateContext()
  if (fs === null) return null
  // `null` when this path has no entry — e.g. a leaf path, or a collection
  // that wasn't walked. (A collection with zero matches has an entry of 0,
  // which is meaningfully different.)
  return fs.visibleChildCounts.get(toPathString(path)) ?? null
}
