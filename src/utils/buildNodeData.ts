import { type CollectionKey, type JsonData, type NodeData } from '../types'
import { extract } from './extract'
import { isCollection } from './misc'

/**
 * Builds a `NodeData` snapshot for an arbitrary path against `fullData`, for
 * `JsonEditor` (root and bridge construction) and `getNextOrPrevious`
 * (synthesising the candidate the Tab-viability predicate is called with).
 *
 * `index` derivation respects the same sort the renderer uses, so a custom
 * `searchFilter`/`allowEdit` callback sees the same `index` it would during
 * render. `rootName` is only used when `path` is empty, and defaults to `''`
 * for callers that never target the root.
 */
export const buildNodeData = (
  fullData: JsonData,
  path: CollectionKey[],
  rootName = '',
  sort?: <T>(arr: T[], nodeMap: (input: T) => [string | number, unknown]) => void
): NodeData => {
  if (path.length === 0) {
    return {
      key: rootName,
      path: [],
      level: 0,
      index: 0,
      value: fullData,
      size: isCollection(fullData) ? Object.keys(fullData).length : 1,
      parentData: null,
      fullData,
    }
  }

  const key = path[path.length - 1]
  const value = extract(fullData, path) as JsonData
  const parentData = (extract(fullData, path.slice(0, -1)) ?? null) as object | null

  let index = 0
  if (Array.isArray(parentData)) {
    index = typeof key === 'number' ? key : Number(key)
  } else if (parentData && typeof parentData === 'object') {
    const entries = Object.entries(parentData) as Array<[string | number, unknown]>
    sort?.(entries, (entry) => entry)
    index = entries.findIndex(([k]) => k === key)
  }

  return {
    key,
    path,
    level: path.length,
    index,
    value,
    size: isCollection(value) ? Object.keys(value as object).length : null,
    parentData,
    fullData,
  }
}
