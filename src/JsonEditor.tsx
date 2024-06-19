import React, { useCallback, useEffect, useState } from 'react'
import assign, { type Input } from 'object-property-assigner'
import extract from 'object-property-extractor'
import { CollectionNode } from './CollectionNode'
import { isCollection, matchNode, matchNodeKey } from './filterHelpers'
import {
  type CollectionData,
  type JsonEditorProps,
  type FilterFunction,
  type InternalUpdateFunction,
  type NodeData,
  type SearchFilterFunction,
  type CollectionKey,
} from './types'
import { useTheme, ThemeProvider } from './theme'
import { TreeStateProvider, useTreeState } from './TreeStateProvider'
import { getTranslateFunction } from './localisation'
import './style.css'
import { ValueNodeWrapper } from './ValueNodeWrapper'
import clone from 'just-clone'

const Editor: React.FC<JsonEditorProps> = ({
  data: srcData,
  // schema,
  rootName = 'root',
  onUpdate = () => {},
  onEdit: srcEdit = onUpdate,
  onDelete: srcDelete = onUpdate,
  onAdd: srcAdd = onUpdate,
  onChange,
  onError,
  showErrorMessages = true,
  enableClipboard = true,
  theme = 'default',
  icons,
  indent = 3,
  collapse = false,
  showCollectionCount = true,
  restrictEdit = false,
  restrictDelete = false,
  restrictAdd = false,
  restrictTypeSelection = false,
  searchFilter: searchFilterInput,
  searchText,
  searchDebounceTime = 350,
  keySort = false,
  showArrayIndices = true,
  showStringQuotes = true,
  defaultValue = null,
  minWidth = 250,
  maxWidth = 'min(600px, 90vw)',
  rootFontSize,
  stringTruncate = 250,
  translations = {},
  className,
  id,
  customText = {},
  customNodeDefinitions = [],
  useJSON5Editor = false,
}) => {
  const { getStyles, setTheme, setIcons } = useTheme()
  const { setCollapseState } = useTreeState()
  const collapseFilter = useCallback(getFilterFunction(collapse), [collapse])
  const translate = useCallback(getTranslateFunction(translations, customText), [
    translations,
    customText,
  ])
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText)

  const [data, setData] = useState(srcData)

  useEffect(() => {
    if (theme) setTheme(theme)
    if (icons) setIcons(icons)
  }, [theme, icons])

  useEffect(() => {
    setCollapseState(null)
    setData(srcData)
  }, [srcData])

  useEffect(() => {
    const debounce = setTimeout(() => setDebouncedSearchText(searchText), searchDebounceTime)
    return () => clearTimeout(debounce)
  }, [searchText, searchDebounceTime])

  const nodeData: NodeData = {
    key: rootName,
    path: [],
    level: 0,
    index: 0,
    value: data,
    size: Object.keys(data).length,
    parentData: null,
    fullData: data,
  }

  const onEdit: InternalUpdateFunction = async (value, path) => {
    const { currentData, newData, currentValue, newValue } = updateDataObject(
      data,
      path,
      value,
      'update'
    )
    if (currentValue === newValue) return

    setData(newData)

    const result = await srcEdit({
      currentData,
      newData,
      currentValue,
      newValue,
      name: path.slice(-1)[0],
      path,
    })
    if (result !== undefined) {
      setData(currentData)
      return result === false ? translate('ERROR_UPDATE', nodeData) : result
    }
  }

  const onDelete: InternalUpdateFunction = async (value, path) => {
    const { currentData, newData, currentValue, newValue } = updateDataObject(
      data,
      path,
      value,
      'delete'
    )
    setData(newData)

    const result = await srcDelete({
      currentData,
      newData,
      currentValue,
      newValue,
      name: path.slice(-1)[0],
      path,
    })
    if (result !== undefined) {
      setData(currentData)
      return result === false ? translate('ERROR_UPDATE', nodeData) : result
    }
  }

  const onAdd: InternalUpdateFunction = async (value, path) => {
    const { currentData, newData, currentValue, newValue } = updateDataObject(
      data,
      path,
      value,
      'add'
    )
    setData(newData)

    const result = await srcAdd({
      currentData,
      newData,
      currentValue,
      newValue,
      name: path.slice(-1)[0],
      path,
    })
    if (result !== undefined) {
      setData(currentData)
      return result === false ? translate('ERROR_UPDATE', nodeData) : result
    }
  }

  // "moveItem" is just a "Delete" followed by an "Add", but we combine into a
  // single "action" and only run one "onUpdate", which also means it'll be
  // registered as a single event in the "Undo" queue
  const moveItem = async (sourcePath: CollectionKey[] | null, destPath: CollectionKey[]) => {
    if (sourcePath === null) return
    const { currentData, newData, currentValue, newValue } = updateDataObject(
      data,
      sourcePath,
      '',
      'delete'
    )
    const result = await srcDelete({
      currentData,
      newData,
      currentValue,
      newValue,
      name: sourcePath.slice(-1)[0],
      path: sourcePath,
    })
    if (result !== undefined) {
      setData(currentData)
      return result === false ? translate('ERROR_UPDATE', nodeData) : result
    }

    // Immediate key of the item being moved
    const originalKey = sourcePath.slice(-1)[0]
    // Where it's going
    const targetPath = destPath.slice(0, -1)
    // The key in the target path to insert before
    const insertBefore = destPath.slice(-1)[0]

    const targetKey =
      typeof insertBefore === 'number'
        ? insertBefore // Moving TO an array
        : typeof originalKey === 'number'
        ? `arr_${originalKey}` // Moving FROM an array, so needs a key
        : originalKey // Moving from object to object

    const { newData: addedData } = updateDataObject(
      newData,
      [...targetPath, targetKey],
      currentValue,
      'add',
      typeof targetKey === 'number' ? true : insertBefore
    )
    const result2 = await srcAdd({
      currentData,
      newData,
      currentValue,
      newValue,
      name: originalKey,
      path: [...targetPath, targetKey],
    })
    if (result2 !== undefined) {
      setData(currentData)
      return result2 === false ? translate('ERROR_UPDATE', nodeData) : result
    }

    setData(addedData)
  }

  const restrictEditFilter = getFilterFunction(restrictEdit)
  const restrictDeleteFilter = getFilterFunction(restrictDelete)
  const restrictAddFilter = getFilterFunction(restrictAdd)
  const searchFilter = getSearchFilter(searchFilterInput)

  const otherProps = {
    name: rootName,
    nodeData,
    onEdit,
    onDelete,
    onAdd,
    onChange,
    onError,
    showErrorMessages,
    moveItem,
    showCollectionCount,
    collapseFilter,
    restrictEditFilter,
    restrictDeleteFilter,
    restrictAddFilter,
    restrictTypeSelection,
    searchFilter,
    searchText: debouncedSearchText,
    enableClipboard,
    keySort,
    showArrayIndices,
    showStringQuotes,
    indent,
    defaultValue,
    stringTruncate,
    translate,
    customNodeDefinitions,
    parentData: null,
    useJSON5Editor,
  }

  const mainContainerStyles = { ...getStyles('container', nodeData), minWidth, maxWidth }

  // Props fontSize takes priority over theme, but we fall back on a default of
  // 16 (from CSS sheet) if neither are provided. Having a defined base size
  // ensures the component doesn't have its fontSize affected from the parent
  // environment
  mainContainerStyles.fontSize = rootFontSize ?? mainContainerStyles.fontSize

  return (
    <div id={id} className={'jer-editor-container ' + className} style={mainContainerStyles}>
      {isCollection(data) ? (
        <CollectionNode data={data} {...otherProps} />
      ) : (
        <ValueNodeWrapper data={data as any} showLabel {...otherProps} />
      )}
    </div>
  )
}

const JsonEditor: React.FC<JsonEditorProps> = (props) => (
  <ThemeProvider>
    <TreeStateProvider>
      <Editor {...props} />
    </TreeStateProvider>
  </ThemeProvider>
)

interface AssignOptions {
  remove?: boolean
  insert?: boolean
  insertBefore?: string
}

const updateDataObject = (
  data: CollectionData,
  path: Array<string | number>,
  newValue: unknown,
  action: 'update' | 'delete' | 'add',
  insert?: true | CollectionKey
) => {
  if (path.length === 0) {
    return {
      currentData: data,
      newData: newValue as CollectionData,
      currentValue: data,
      newValue,
    }
  }

  const assignOptions: AssignOptions = { remove: action === 'delete' }
  if (insert === true) assignOptions.insert = true
  if (typeof insert === 'string') assignOptions.insertBefore = insert

  const currentValue = action !== 'add' ? extract(data, path) : undefined
  const newData = assign(clone(data) as Input, path, newValue, assignOptions)

  return {
    currentData: data,
    newData,
    currentValue,
    newValue: action !== 'delete' ? newValue : undefined,
  }
}

const getFilterFunction = (propValue: boolean | number | FilterFunction): FilterFunction => {
  if (typeof propValue === 'boolean') return () => propValue
  if (typeof propValue === 'number') return ({ level }) => level >= propValue
  return propValue
}

const getSearchFilter = (
  searchFilterInput: 'key' | 'value' | 'all' | SearchFilterFunction | undefined
): SearchFilterFunction | undefined => {
  if (searchFilterInput === undefined) return undefined
  if (searchFilterInput === 'value') {
    return matchNode as SearchFilterFunction
  }
  if (searchFilterInput === 'key') {
    return matchNodeKey
  }
  if (searchFilterInput === 'all') {
    return (inputData, searchText) =>
      matchNode(inputData, searchText) || matchNodeKey(inputData, searchText)
  }
  return searchFilterInput
}

export default JsonEditor
