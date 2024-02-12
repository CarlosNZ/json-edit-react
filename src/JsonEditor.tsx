import React, { useCallback, useEffect } from 'react'
import assign, { Input } from 'object-property-assigner'
import extract from 'object-property-extractor'
import clone from 'just-clone'
import { CollectionNode, isCollection } from './CollectionNode'
import {
  CollectionData,
  JsonEditorProps,
  FilterFunction,
  OnChangeFunction,
  NodeData,
} from './types'
import { useTheme, ThemeProvider } from './theme'
import { getTranslateFunction } from './localisation'
import './style.css'
import { ValueNodeWrapper } from './ValueNodeWrapper'

const Editor: React.FC<JsonEditorProps> = ({
  data,
  // schema,
  rootName = 'root',
  onUpdate,
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
  const { styles, setTheme, setIcons } = useTheme()
  const collapseFilter = useCallback(getFilterFunction(collapse), [collapse])
  const translate = useCallback(getTranslateFunction(translations, customText), [
    translations,
    customText,
  ])

  useEffect(() => {
    if (theme) setTheme(theme)
    if (icons) setIcons(icons)
    // eslint-disable-next-line
  }, [theme, icons])

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
    if (srcEdit) {
      const result = await srcEdit({
        currentData,
        newData,
        currentValue,
        newValue,
        name: path.slice(-1)[0],
        path,
      })
      if (result === false) return translate('ERROR_UPDATE', nodeData)
      return result // Error string
    }
  }

  const onDelete: OnChangeFunction = async (value, path) => {
    const { currentData, newData, currentValue, newValue } = updateDataObject(
      data,
      path,
      value,
      'delete'
    )
    if (srcDelete) {
      const result = await srcDelete({
        currentData,
        newData,
        currentValue,
        newValue,
        name: path.slice(-1)[0],
        path,
      })
      if (result === false) return translate('ERROR_DELETE', nodeData)
      return result // Error string
    }
  }

  const onAdd: OnChangeFunction = async (value, path) => {
    const { currentData, newData, currentValue, newValue } = updateDataObject(
      data,
      path,
      value,
      'add'
    )
    if (srcAdd) {
      const result = await srcAdd({
        currentData,
        newData,
        currentValue,
        newValue,
        name: path.slice(-1)[0],
        path,
      })
      if (result === false) return translate('ERROR_ADD', nodeData)
      return result // Error string
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

  if (!styles) return null

  return (
    <div
      className={'jer-editor-container ' + className}
      style={{ ...styles.container, minWidth, maxWidth }}
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
    <Editor {...props} />
  </ThemeProvider>
)

const updateDataObject = (
  data: CollectionData,
  path: (string | number)[],
  newValue: unknown,
  action: 'update' | 'delete' | 'add'
) => {
  if (path.length === 0) {
    return {
      currentData: data,
      newData: newValue as CollectionData,
      currentValue: data,
      newValue: newValue,
    }
  }

  const currentValue = action !== 'add' ? extract(data, path) : undefined
  const newData = assign(clone(data as Input), path, newValue, {
    remove: action === 'delete',
  })

  return {
    currentData: data,
    newData,
    currentValue,
    newValue: action === 'update' ? newValue : undefined,
  }
}

const getFilterFunction = (propValue: boolean | number | FilterFunction): FilterFunction => {
  if (typeof propValue === 'boolean') return () => propValue
  if (typeof propValue === 'number') return ({ level }) => level >= propValue
  return propValue
}

export default JsonEditor
