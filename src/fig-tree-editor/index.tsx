import { useState } from 'react'
import { ObjectNode } from './nodeComponents'
import { updateDataObject } from './utilityMethods'
import { EditorProps, OnChangeMethod } from './types'
import './style.css'

const JsonEditor: React.FC<EditorProps> = ({
  data: srcData,
  schema,
  rootName = 'root',
  onUpdate,
  onEdit: srcEdit = onUpdate,
  onDelete: srcDelete = onUpdate,
  onAdd: srcAdd = onUpdate,
  onCopy: srcCopy,
  theme,
  style,
  indent = 4,
  collapse = false,
  restrictEdit = false,
  restrictDelete = false,
  restrictAdd = false,
}) => {
  const [data, setData] = useState<object>(srcData)

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
      if (result !== false) setData(newData)
      if (result === false) return 'Update unsuccessful'
    } else setData(newData)
  }

  const onDelete: OnChangeMethod = async () => {}

  const onAdd: OnChangeMethod = async () => {}

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
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}

export default JsonEditor
