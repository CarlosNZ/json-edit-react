import React, { useCallback, useEffect, useState } from 'react'
import clone from 'just-clone'
import assign from 'object-property-assigner'
import extract from 'object-property-extractor'
import { useWindowSize } from '@react-hookz/web'
import { CollectionNode, isCollection } from './CollectionNode'
import { CollectionData, EditorProps, FilterMethod, OnChangeMethod } from './types'
import './style.css'
import { useTheme } from './useTheme'
import { generateUniqueId } from './AutogrowTextArea'

const JsonEditor: React.FC<EditorProps> = ({
  data: srcData,
  // schema,
  rootName = 'root',
  onUpdate,
  onEdit: srcEdit = onUpdate,
  onDelete: srcDelete = onUpdate,
  onAdd: srcAdd = onUpdate,
  enableClipboard = true,
  theme = 'default',
  style = {},
  indent = 2,
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
}) => {
  const [data, setData] = useState<object>(srcData)
  const collapseFilter = useCallback(getFilterMethod(collapse), [collapse])

  const { setTheme } = useTheme(theme)

  useEffect(() => {
    setData(srcData)
  }, [srcData])

  useEffect(() => {
    setTheme(theme)
  }, [theme])

  const { width } = useWindowSize()
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
      if (result === false) return 'Update unsuccessful'
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
      if (result === false) return 'Delete unsuccessful'
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
      if (result === false) return 'Adding node unsuccessful'
      return result // Error string
    } else setData(newData)
  }

  // const collapseFilter = getFilterMethod(collapse)
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
    style,
    indent,
    defaultValue,
    stringTruncate,
  }

  return (
    <div
      id={generateUniqueId()}
      className="jer-editor-container"
      style={{ ...style, minWidth, maxWidth: maximumWidth }}
    >
      {isCollection(data) && <CollectionNode data={data} path={[]} {...otherProps} />}
    </div>
  )
}

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

  const newData = clone(data)

  const currentValue = action !== 'add' ? extract(newData, path) : undefined
  assign(newData, path, newValue, { remove: action === 'delete' })

  return {
    currentData: data,
    newData,
    currentValue,
    newValue: action === 'update' ? newValue : undefined,
  }
}

const getFilterMethod = (collapse: boolean | number | FilterMethod): FilterMethod => {
  if (typeof collapse === 'boolean') return () => collapse
  if (typeof collapse === 'number') return ({ level }) => level >= collapse
  return collapse
}

export default JsonEditor
