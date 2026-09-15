/**
 * Filter-state slice: surfaces the pre-computed `{ visiblePaths,
 * visibleChildCounts }` from `JsonEditor`, so per-node visibility and counts
 * are an O(1) Set/Map lookup rather than a subtree walk per node.
 *
 * A dumb provider: `JsonEditor` owns the `useMemo` that builds the state and
 * passes it in. That keeps the algorithm testable outside React (see
 * `computeFilterState` in `utils/filter.ts`), and keeps the context value's
 * identity stable except when `(data, searchText, searchFilter)` change, which
 * the node memoisation depends on.
 */

import React, { createContext, useContext } from 'react'
import { type CollectionKey } from '../types'
import { type FilterState } from '../utils/filter'
import { toPathString } from '../utils/pathTools'

// `null` means no filter is active, as distinct from `undefined`, which means
// the provider is missing. The hooks throw on `undefined`, so a misuse outside
// the editor surfaces loudly instead of silently returning "visible".
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

// The whole bundle, for callers testing many candidate paths from a closure
// (e.g. the Tab-viability predicate in ValueNodeWrapper), where a hook per
// candidate would break the rules of hooks.
export const useRawFilterState = (): FilterState | null => useFilterStateContext()

export const useNodeVisible = (path: CollectionKey[]): boolean => {
  const fs = useFilterStateContext()
  if (fs === null) return true
  return fs.visiblePaths.has(toPathString(path))
}

export const useVisibleChildCount = (path: CollectionKey[]): number | null => {
  const fs = useFilterStateContext()
  if (fs === null) return null
  // A collection with zero matches has an entry of 0, which is meaningfully
  // different from having no entry at all (a leaf, or an unwalked collection).
  return fs.visibleChildCounts.get(toPathString(path)) ?? null
}
