import { type NodeData, type SearchFilterFunction } from '../types'
import { isCollection } from './misc'
import { toPathString } from './pathTools'

/**
 * Pre-computed visibility state for the whole tree under a given search.
 * Produced once at the JsonEditor level (see `computeFilterState` below)
 * and surfaced to nodes via the `FilterStateProvider` context slice.
 *
 *  - `visiblePaths` — every node whose own match or whose descendant's
 *    match keeps it on screen (ancestors of a matching node stay visible).
 *  - `visibleChildCounts` — for every collection node, how many of its
 *    direct children are visible. Powers the "n of m" filtered-count
 *    display.
 *
 * Keys are produced by `toPathString` so they're stable, collision-free,
 * and cheap to look up.
 */
export interface FilterState {
  visiblePaths: Set<string>
  visibleChildCounts: Map<string, number>
}

/**
 * Single post-order DFS that decides which nodes stay visible under the
 * current search, and counts the visible direct children of every
 * collection along the way. Returns `null` when no filter is active — the
 * caller fast-paths to "everything visible, use raw `size`".
 *
 * Replaces the old per-CollectionNode `filterNode`/`filterCollection`
 * pair, which independently re-walked every visible collection's subtree.
 * That cost ~O(n × depth); this is O(n). The redundancy multiplier the
 * previous approach paid grew with depth — measured ~4× on balanced
 * trees, ~11× on deep trees in the filter bench.
 *
 * Also fixes a real correctness bug in the old approach:
 * `filterCollection` recursed into child collections without first
 * testing the child's own matcher, so an intermediate collection whose
 * key matched but whose body was empty (or whose descendants weren't
 * path-aware-matched) would drop out and drag its ancestors with it. The
 * walk here tests every node, including intermediate collections.
 */
export const computeFilterState = (
  rootNodeData: NodeData,
  searchFilter: SearchFilterFunction | undefined,
  searchText: string | undefined
): FilterState | null => {
  if (!searchFilter && !searchText) return null

  const visiblePaths = new Set<string>()
  const visibleChildCounts = new Map<string, number>()
  // Match the editor's default-matcher rule: when no searchFilter is
  // given but searchText is set, fall back to the per-value matcher.
  // Same as the old filterNode's value branch did.
  const matcher = searchFilter ?? matchNode
  const text = searchText ?? ''

  const walk = (nd: NodeData): boolean => {
    let matched = matcher(nd, text)
    if (isCollection(nd.value)) {
      let visibleChildren = 0
      const isArr = Array.isArray(nd.value)
      const entries = Object.entries(nd.value as object)
      for (const [key, value] of entries) {
        const childKey = isArr ? Number(key) : key
        const childPath = [...nd.path, childKey]
        const childNd: NodeData = {
          key: childKey,
          path: childPath,
          level: nd.level + 1,
          index: visibleChildren,
          value,
          size: isCollection(value) ? Object.keys(value as object).length : null,
          parentData: nd.value as object,
          fullData: nd.fullData,
        }
        if (walk(childNd)) {
          matched = true
          visibleChildren++
        }
      }
      visibleChildCounts.set(toPathString(nd.path), visibleChildren)
    }
    if (matched) visiblePaths.add(toPathString(nd.path))
    return matched
  }

  walk(rootNodeData)
  return { visiblePaths, visibleChildCounts }
}

export const matchNode: (input: Partial<NodeData>, searchText: string) => boolean = (
  nodeData,
  searchText = ''
) => {
  const { value } = nodeData

  // Any partial completion of the input "null" will match null values
  if (value === null && 'null'.includes(searchText.toLowerCase())) return true

  switch (typeof value) {
    case 'string':
      return value.toLowerCase().includes(searchText.toLowerCase())
    case 'number':
      return !!String(value).includes(searchText)
    case 'boolean':
      // Will match partial completion of the inputs "true" and "false", as well
      // as "1" or "0"
      if (value) {
        return 'true'.includes(searchText.toLowerCase()) || searchText === '1'
      } else {
        return 'false'.includes(searchText.toLowerCase()) || searchText === '0'
      }
    default:
      return false
  }
}

export const matchNodeKey: SearchFilterFunction = ({ key, path }, searchText = '') => {
  if (matchNode({ value: key }, searchText)) return true
  if (path.some((field) => matchNode({ value: field }, searchText))) return true
  return false
}
