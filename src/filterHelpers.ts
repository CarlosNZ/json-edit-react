import { type SearchFilterFunction, type NodeData } from './types'

export const isCollection = (value: unknown): value is Record<string, unknown> | unknown[] =>
  value !== null && typeof value === 'object'

export const filterNode = (
  type: 'collection' | 'value',
  nodeData: NodeData,
  searchFilter: SearchFilterFunction | undefined,
  searchText: string | undefined
): boolean => {
  if (!searchFilter && !searchText) return true

  switch (type) {
    case 'collection':
      if (
        searchFilter &&
        !searchFilter(nodeData, searchText) &&
        !filterCollection(searchText, nodeData, searchFilter)
      ) {
        return false
      }
      if (!searchFilter && searchText && !filterCollection(searchText, nodeData)) return false
      break
    case 'value':
      if (searchFilter && !searchFilter(nodeData, searchText)) return false
      if (!searchFilter && searchText && !matchNode(nodeData, searchText)) return false
  }

  return true
}

export const filterCollection = (
  searchText: string = '',
  nodeData: NodeData,
  matcher: SearchFilterFunction = matchNode
): boolean => {
  const collection = nodeData.value as object | unknown[]
  const entries = Object.entries(collection)

  return entries.some(([key, value]) => {
    const childPath = [...nodeData.path, key]

    const childNodeData = {
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

export const matchNode: SearchFilterFunction = (inputData, searchText = '') => {
  const { matchValue, matchField, ...nodeData } = inputData
  const value =
    matchValue ?? matchField
      ? nodeData[matchField as 'key' | 'value' | 'level' | 'size']
      : nodeData.value

  if (value === null && 'null'.includes(searchText.toLowerCase())) return true

  switch (typeof value) {
    case 'string':
      return value.toLowerCase().includes(searchText.toLowerCase())
    case 'number':
      return !!String(value).includes(searchText)
    case 'boolean':
      if (value) {
        return 'true'.includes(searchText.toLowerCase()) || searchText === '1'
      } else {
        return 'false'.includes(searchText.toLowerCase()) || searchText === '0'
      }
    default:
      return false
  }
}
