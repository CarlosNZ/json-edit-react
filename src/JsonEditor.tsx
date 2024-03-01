import React, { useCallback, useEffect, useState } from 'react'
import assign, { type Input } from 'object-property-assigner'
import extract from 'object-property-extractor'
import { CollectionNode, isCollection } from './CollectionNode'
import {
  type CollectionData,
  type JsonEditorProps,
  type FilterFunction,
  type OnChangeFunction,
  type NodeData,
} from './types'
import { useTheme, ThemeProvider } from './theme'
import { CollapseProvider, useCollapseAll } from './CollapseProvider'
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
  keySort = false,
  showArrayIndices = true,
  defaultValue = null,
  minWidth = 250,
  maxWidth = 'min(600px, 90vw)',
  stringTruncate = 250,
  translations = {},
  className,
  customText = {},
  customNodeDefinitions = [],
}) => {
  const { getStyles, setTheme, setIcons } = useTheme()
  const { setCollapseState } = useCollapseAll()
  const collapseFilter = useCallback(getFilterFunction(collapse), [collapse])
  const translate = useCallback(getTranslateFunction(translations, customText), [
    translations,
    customText,
  ])

  const [data, setData] = useState(srcData)

  useEffect(() => {
    if (theme) setTheme(theme)
    if (icons) setIcons(icons)
  }, [theme, icons])

  useEffect(() => {
    setCollapseState(null)
    setData(srcData)
  }, [srcData])

  const nodeData: NodeData = {
    key: rootName,
    path: [],
    level: 0,
    value: data,
    size: Object.keys(data).length,
  }

  const onEdit: OnChangeFunction = async (value, path) => {
    const { currentData, newData, currentValue, newValue } = updateDataObject(
      data,
      path,
      value,
      'update'
    )
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

  const onDelete: OnChangeFunction = async (value, path) => {
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

  const onAdd: OnChangeFunction = async (value, path) => {
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

  const restrictEditFilter = getFilterFunction(restrictEdit)
  const restrictDeleteFilter = getFilterFunction(restrictDelete)
  const restrictAddFilter = getFilterFunction(restrictAdd)

  const otherProps = {
    name: rootName,
    nodeData,
    onEdit,
    onDelete,
    onAdd,
    showCollectionCount,
    collapseFilter,
    restrictEditFilter,
    restrictDeleteFilter,
    restrictAddFilter,
    restrictTypeSelection,
    enableClipboard,
    keySort,
    showArrayIndices,
    indent,
    defaultValue,
    stringTruncate,
    translate,
    customNodeDefinitions,
    parentData: null,
  }

  // if (!styles) return null

  return (
    <div
      className={'jer-editor-container ' + className}
      style={{ ...getStyles('container', nodeData), minWidth, maxWidth }}
    >
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
    <CollapseProvider>
      <Editor {...props} />
    </CollapseProvider>
  </ThemeProvider>
)

const updateDataObject = (
  data: CollectionData,
  path: Array<string | number>,
  newValue: unknown,
  action: 'update' | 'delete' | 'add'
) => {
  if (path.length === 0) {
    return {
      currentData: data,
      newData: newValue as CollectionData,
      currentValue: data,
      newValue,
    }
  }

  const currentValue = action !== 'add' ? extract(data, path) : undefined
  const newData = assign(clone(data) as Input, path, newValue, {
    remove: action === 'delete',
  })

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

export default JsonEditor
