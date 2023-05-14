import { useState } from 'react'
import clone from 'just-clone'
import { CollectionNode } from './CollectionNode'
import { CollectionData, EditorProps, FilterMethod, OnChangeMethod } from './types'
import './style.css'
import { useTheme, defaultTheme } from './theme'

const JsonEditor: React.FC<EditorProps> = ({
  data: srcData,
  schema,
  rootName = 'root',
  onUpdate,
  onEdit: srcEdit = onUpdate,
  onDelete: srcDelete = onUpdate,
  onAdd: srcAdd = onUpdate,
  enableClipboard = true,
  theme = defaultTheme,
  style = {},
  indent = 2,
  collapse = false,
  restrictEdit = false,
  restrictDelete = false,
  restrictAdd = false,
  keySort = false,
  showArrayIndices = true,
  defaultValue = null,
}) => {
  const [data, setData] = useState<object>(srcData)

  useTheme(theme)

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
      if (result !== false) setData(newData)
      if (result === false) return 'Update unsuccessful'
    } else setData(newData)
  }

  const onAdd: OnChangeMethod = async (value, path) => {
    const { currentData, newData, currentValue, newValue } = updateDataObject(
      data,
      path,
      value,
      'update'
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
      if (result !== false) setData(newData)
      if (result === false) return 'Adding node unsuccessful'
    } else setData(newData)
  }

  const collapseFilter = getFilterMethod(collapse)
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
  }

  return (
    <div className="fg-editor-container" style={style}>
      {Array.isArray(data) && <p>Array component</p>}
      {isCollection(data) && <CollectionNode data={data} path={[]} {...otherProps} />}
    </div>
  )
}

export const isCollection = (value: unknown) => value !== null && typeof value == 'object'

const updateDataObject = (
  data: CollectionData,
  path: (string | number)[],
  newValue: unknown,
  action: 'update' | 'delete'
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

  let d = newData as Record<number | string, unknown>
  let currentValue
  for (let i = 0; i < path.length; i++) {
    const part = path[i]
    if (i === path.length - 1) {
      currentValue = d[part]
      if (action === 'update') d[part] = newValue
      if (action === 'delete') delete d[part]
    }
    d = d[part] as Record<number | string, unknown>
  }
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
