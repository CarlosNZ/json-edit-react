import React, { useCallback, useEffect, useState } from 'react'
import assign from 'object-property-assigner'
import extract from 'object-property-extractor'
import clone from 'just-clone'
import { useWindowSize } from '@react-hookz/web'
import { CollectionNode, isCollection } from './CollectionNode'
import { CollectionData, JsonEditorProps, FilterMethod, OnChangeMethod } from './types'
import { useTheme, ThemeProvider } from './theme'
import { getTranslateMethod } from './localisation'
import './style.css'

const Editor: React.FC<JsonEditorProps> = ({
  data: srcData,
  // schema,
  rootName = 'root',
  onUpdate,
  onEdit: srcEdit = onUpdate,
  onDelete: srcDelete = onUpdate,
  onAdd: srcAdd = onUpdate,
  enableClipboard = true,
  theme = 'default',
  icons,
  className,
  indent = 4,
  collapse = false,
  restrictEdit = false,
  restrictDelete = false,
  restrictAdd = false,
  keySort = false,
  showArrayIndices = true,
  defaultValue = null,
  minWidth = 250,
  maxWidth = 600,
  stringTruncate = 250,
  translations = {},
}) => {
  const [data, setData] = useState<object>(srcData)
  const { styles, setTheme, setIcons } = useTheme()
  const collapseFilter = useCallback(getFilterMethod(collapse), [collapse])
  const translate = useCallback(getTranslateMethod(translations), [translations])

  useEffect(() => {
    setData(srcData)
  }, [srcData])

  useEffect(() => {
    if (theme) setTheme(theme)
    if (icons) setIcons(icons)
  }, [theme, icons])

  const { width } = useWindowSize()
  // So component can't overflow the current viewport
  const maximumWidth = Math.min(maxWidth, width - 10)

  const onEdit: OnChangeMethod = async (value, path) => {
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
      if (result === undefined) setData(newData)
      if (result === false) return translate('ERROR_UPDATE')
      return result // Error string
    } else setData(newData)
  }

  const onDelete: OnChangeMethod = async (value, path) => {
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
      if (result === undefined) setData(newData)
      if (result === false) return translate('ERROR_DELETE')
      return result // Error string
    } else setData(newData)
  }

  const onAdd: OnChangeMethod = async (value, path) => {
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
      if (result === undefined) setData(newData)
      if (result === false) return translate('ERROR_ADD')
      return result // Error string
    } else setData(newData)
  }

  const restrictEditFilter = getFilterMethod(restrictEdit)
  const restrictDeleteFilter = getFilterMethod(restrictDelete)
  const restrictAddFilter = getFilterMethod(restrictAdd)

  const otherProps = {
    name: rootName,
    onEdit,
    onDelete,
    onAdd,
    collapseFilter,
    restrictEditFilter,
    restrictDeleteFilter,
    restrictAddFilter,
    enableClipboard,
    keySort,
    showArrayIndices,
    indent,
    defaultValue,
    stringTruncate,
    translate,
  }

  if (!styles) return null

  return (
    <div
      className={'jer-editor-container ' + className}
      style={{ ...styles.container, minWidth, maxWidth: maximumWidth }}
    >
      {isCollection(data) && <CollectionNode data={data} path={[]} {...otherProps} />}
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
  const newData = assign(clone(data), path, newValue, { remove: action === 'delete' })

  return {
    currentData: data,
    newData,
    currentValue,
    newValue: action === 'update' ? newValue : undefined,
  }
}

const getFilterMethod = (propValue: boolean | number | FilterMethod): FilterMethod => {
  if (typeof propValue === 'boolean') return () => propValue
  if (typeof propValue === 'number') return ({ level }) => level >= propValue
  return propValue
}

export default JsonEditor
