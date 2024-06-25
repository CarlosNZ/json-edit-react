import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
  restrictDrag = true,
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
    } else setData(newData)
  }

  const onDelete: InternalUpdateFunction = async (value, path) => {
    const { currentData, newData, currentValue, newValue } = updateDataObject(
      data,
      path,
      value,
      'delete'
    )

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
    } else setData(newData)
  }

  const onAdd: InternalUpdateFunction = async (value, path) => {
    const { currentData, newData, currentValue, newValue } = updateDataObject(
      data,
      path,
      value,
      'add'
    )

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
    } else setData(newData)
  }

  // "onMove" is just a "Delete" followed by an "Add", but we combine into a
  // single "action" and only run one "onUpdate", which also means it'll be
  // registered as a single event in the "Undo" queue.
  // If either action returns an error, we reset the data the same way we do
  // when a single action returns error.
  const onMove = async (
    sourcePath: CollectionKey[] | null,
    destPath: CollectionKey[],
    position: 'above' | 'below'
  ) => {
    if (sourcePath === null) return
    const { currentData, newData, currentValue } = updateDataObject(data, sourcePath, '', 'delete')

    // Immediate key of the item being moved
    const originalKey = sourcePath.slice(-1)[0]
    // Where it's going
    const targetPath = destPath.slice(0, -1)
    // The key in the target path to insert before or after
    const insertPos = destPath.slice(-1)[0]

    let targetKey =
      typeof insertPos === 'number' // Moving TO an array
        ? position === 'above'
          ? insertPos
          : insertPos + 1
        : typeof originalKey === 'number'
        ? `arr_${originalKey}` // Moving FROM an array, so needs a key
        : originalKey // Moving from object to object

    const sourceBase = sourcePath.slice(0, -1).join('.')
    const destBase = destPath.slice(0, -1).join('.')

    if (
      sourceBase === destBase &&
      typeof originalKey === 'number' &&
      typeof targetKey === 'number' &&
      originalKey < targetKey
    ) {
      targetKey -= 1
    }

    const insertOptions =
      typeof targetKey === 'number'
        ? { insert: true }
        : position === 'above'
        ? { insertBefore: insertPos }
        : { insertAfter: insertPos }

    const { newData: addedData, newValue: addedValue } = updateDataObject(
      newData,
      [...targetPath, targetKey],
      currentValue,
      'add',
      insertOptions as AssignOptions
    )

    const result = await srcEdit({
      currentData,
      newData: addedData,
      currentValue,
      newValue: addedValue,
      name: destPath.slice(-1)[0],
      path: destPath,
    })
    if (result !== undefined) {
      setData(currentData)
      return result === false ? translate('ERROR_UPDATE', nodeData) : result
    } else setData(addedData)
  }

  const restrictEditFilter = useMemo(() => getFilterFunction(restrictEdit), [restrictEdit])
  const restrictDeleteFilter = useMemo(() => getFilterFunction(restrictDelete), [restrictDelete])
  const restrictAddFilter = useMemo(() => getFilterFunction(restrictAdd), [restrictAdd])
  const restrictDragFilter = useMemo(() => getFilterFunction(restrictDrag), [restrictDrag])
  const searchFilter = useMemo(() => getSearchFilter(searchFilterInput), [searchFilterInput])

  const otherProps = {
    name: rootName,
    nodeData,
    onEdit,
    onDelete,
    onAdd,
    onChange,
    onError,
    showErrorMessages,
    onMove,
    showCollectionCount,
    collapseFilter,
    restrictEditFilter,
    restrictDeleteFilter,
    restrictAddFilter,
    restrictTypeSelection,
    restrictDragFilter,
    canDragOnto: false, // can't drag onto outermost container
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
  insert?: true
  insertBefore?: string
  insertAfter?: string
}

const updateDataObject = (
  data: CollectionData,
  path: Array<string | number>,
  newValue: unknown,
  action: 'update' | 'delete' | 'add',
  insertOptions: { insert?: true; insertBefore?: string; insertAfter?: string } = {}
) => {
  if (path.length === 0) {
    return {
      currentData: data,
      newData: newValue as CollectionData,
      currentValue: data,
      newValue,
    }
  }

  const assignOptions: AssignOptions = {
    remove: action === 'delete',
    ...insertOptions,
  }

  const currentValue = action !== 'add' ? extract(data, path) : undefined
  const newData = assign(data as Input, path, newValue, assignOptions)

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
