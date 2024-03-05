import { type SearchFilterFunction, type NodeData, type SearchFilterInputFunction } from './types'

export const isCollection = (value: unknown): value is Record<string, unknown> | unknown[] =>
  value !== null && typeof value === 'object'

/**
 * Handles the overall logic for whether a node should be visible or not, and
 * returns true/false accordingly. Collections must be handled differently to
 * primitive values, as they must also check their children (recursively)
 */
export const filterNode = (
  type: 'collection' | 'value',
  nodeData: NodeData,
  searchFilter: SearchFilterFunction | undefined,
  searchText: string | undefined = ''
): boolean => {
  if (!searchFilter && !searchText) return true

  switch (type) {
    case 'collection':
      if (searchFilter) {
        if (searchFilter(nodeData, searchText)) return true
        if (!filterCollection(searchText, nodeData, searchFilter)) return false
      }
      if (!searchFilter && searchText && !filterCollection(searchText, nodeData)) return false
      break
    case 'value':
      if (searchFilter && !searchFilter(nodeData, searchText)) return false
      if (!searchFilter && searchText && !matchNode(nodeData, searchText)) return false
  }

  return true
}

// Each collection must recursively check the matches of all its descendants --
// if a deeply nested node matches the searchFilter, then all it's ancestors
// must also remain visible
const filterCollection = (
  searchText: string = '',
  nodeData: NodeData,
  matcher: SearchFilterInputFunction | SearchFilterFunction = matchNode
): boolean => {
  const collection = nodeData.value as object | unknown[]
  const entries = Object.entries(collection)

  return entries.some(([key, value]) => {
    const childPath = [...nodeData.path, key]

    const childNodeData = {
      ...nodeData,
      key,
      path: childPath,
      level: nodeData.level + 1,
      value,
      size: childPath.length,
      parentData: collection,
    }
    if (isCollection(value)) return filterCollection(searchText, childNodeData, matcher)

    return matcher(childNodeData, searchText)
  })
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
