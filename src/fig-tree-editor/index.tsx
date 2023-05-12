import { useState } from 'react'
import { ObjectNode } from './CollectionNodes'
import { updateDataObject } from './utilityMethods'
import { EditorProps, OnChangeMethod } from './types'
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
  onCopy: srcCopy,
  theme = defaultTheme,
  style,
  indent = 4,
  collapse = false,
  restrictEdit = false,
  restrictDelete = false,
  restrictAdd = false,
  restrictKeyEdit = false,
  keySort,
  defaultKeyName,
  defaultValue = 'NEW VALUE',
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
    console.log({ currentData, newData, currentValue, newValue })
    if (srcEdit) {
      const result = await srcEdit({
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

  const collapseFilter = () => {}

  const otherProps = {
    name: rootName,
    onEdit,
    onDelete,
    onAdd,
    collapseFilter,
  }

  return (
    <div className="fg-editor-container">
      {Array.isArray(data) && <p>Array component</p>}
      {typeof data === 'object' && data !== null && (
        <ObjectNode data={data} path={[]} {...otherProps} />
      )}
      {/* <pre>{JSON.stringify(data, null, 2)}</pre> */}
    </div>
  )
}

export default JsonEditor
