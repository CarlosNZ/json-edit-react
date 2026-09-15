import { type NodeData, type SearchFilterFunction } from '../types'
import { isCollection } from './misc'
import { toPathString } from './pathTools'

/**
 * Pre-computed visibility state for the whole tree under a given search,
 * produced once at the JsonEditor level and surfaced to nodes via the
 * `FilterStateProvider` context slice.
 *
 *  - `visiblePaths` — every node kept on screen by its own match or a
 *    descendant's, ancestors of a matching node included.
 *  - `visibleChildCounts` — how many direct children of each collection are
 *    visible, powering the "n of m" filtered-count display.
 *
 * Keys come from `toPathString`, so they're stable, collision-free and cheap to
 * look up.
 */
export interface FilterState {
  visiblePaths: Set<string>
  visibleChildCounts: Map<string, number>
}

/**
 * Single post-order DFS deciding which nodes stay visible under the current
 * search, counting each collection's visible direct children along the way.
 * Returns `null` when no filter is active, which the caller fast-paths to
 * "everything visible, use raw `size`".
 */
export const computeFilterState = (
  rootNodeData: NodeData,
  searchFilter: SearchFilterFunction | undefined,
  searchText: string | undefined
): FilterState | null => {
  if (!searchFilter && !searchText) return null

  const visiblePaths = new Set<string>()
  const visibleChildCounts = new Map<string, number>()
  // The editor's default-matcher rule: with no `searchFilter` but a
  // `searchText`, fall back to the per-value matcher.
  const matcher = searchFilter ?? matchNode
  const text = searchText ?? ''

  const walk = (nd: NodeData): boolean => {
    let matched = matcher(nd, text)
    if (isCollection(nd.value)) {
      let visibleChildren = 0
      const isArr = Array.isArray(nd.value)
      const entries = Object.entries(nd.value)
      for (const [key, value] of entries) {
        const childKey = isArr ? Number(key) : key
        const childPath = [...nd.path, childKey]
        const childNd: NodeData = {
          key: childKey,
          path: childPath,
          level: nd.level + 1,
          index: visibleChildren,
          value,
          size: isCollection(value) ? Object.keys(value).length : null,
          parentData: nd.value,
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

  // Any partial completion of "null" matches a null value
  if (value === null && 'null'.includes(searchText.toLowerCase())) return true

  switch (typeof value) {
    case 'string':
      return value.toLowerCase().includes(searchText.toLowerCase())
    case 'number':
      return !!String(value).includes(searchText)
    case 'boolean':
      // Matches partial completions of "true" and "false", plus "1" and "0"
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
