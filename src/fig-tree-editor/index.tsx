import { useState } from 'react'
import { updateDataObject } from './utilityMethods'

type UpdateMethod = (props: {
  newData: object
  currentData: object
  newValue: unknown
  currentValue: unknown
  name: string
  path: string[]
}) => void | false

type FilterMethod = (input: { name: string; path: string[]; value: unknown }) => boolean

type DataType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'invalid'

interface EditorProps {
  data: object
  schema?: object
  rootName?: string
  onUpdate?: UpdateMethod
  onEdit?: UpdateMethod
  onDelete?: UpdateMethod
  onAdd?: UpdateMethod
  onCopy?: (value: unknown) => void
  theme?: any // UPDATE
  style?: object // UPDATE
  indent?: number
  collapse?: boolean | number | FilterMethod
  restrictEdit?: FilterMethod | boolean
  restrictDelete?: FilterMethod | boolean
  restrictAdd?: FilterMethod | boolean
  keySort?: boolean // OR Comparator Method
}

type OnChangeMethod = <T>(value: T, path: string[]) => Promise<string | void>

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

  const onDelete = () => {}

  const onAdd = () => {}

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
      {getComponent(data, [], otherProps)}
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}

interface NodeProps {
  data: unknown
  path: string[]
  name: string
  onEdit: OnChangeMethod
  onDelete?: () => {}
}

interface ObjectNodeProps extends NodeProps {
  data: object
  onAdd?: () => {}
}

interface ValueNodeProps extends NodeProps {
  data: string
}

export const ObjectNode: React.FC<ObjectNodeProps> = ({ data, path, ...props }) => {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="fg-component fb-object-component">
      <span onClick={() => setCollapsed(!collapsed)}>X</span>
      <strong>{props.name}</strong>
      {!collapsed && (
        <div className="fg-object-elements">
          {Object.entries(data)
            // TO-DO: Sort keys if "keySort" prop specified
            .map(([key, value]) =>
              getComponent(value, [...path, key], { ...props, name: key }, key)
            )}
        </div>
      )}
    </div>
  )
}

const ValueNode: React.FC<ValueNodeProps> = ({ data, name, path, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(data)
  const [error, setError] = useState<string | null>(null)
  const [dataType, setDataType] = useState<DataType>('string')

  const handleEdit = () => {
    setIsEditing(false)
    onEdit(value, path).then((result) => {
      if (result) {
        setError(result)
        setTimeout(() => setError(null), 3000)
        console.log('Error', result)
      }
    })
  }

  return (
    <div className="fg-component fg-string-component">
      <span>{name}: </span>
      <StringValue
        value={value}
        setValue={setValue}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        path={path}
        error={error}
      />
      {isEditing ? (
        <InputButtons
          onAccept={handleEdit}
          onCancel={() => {
            setIsEditing(false)
            setValue(data)
          }}
        />
      ) : (
        <EditButtons />
      )}
    </div>
  )
}

const StringValue: React.FC<{
  value: string
  setValue: Function
  isEditing: boolean
  setIsEditing: Function
  path: string[]
  error: string | null
}> = ({ value, setValue, isEditing, path, setIsEditing, error }) => {
  return isEditing ? (
    <input
      className="fg-text-input"
      type="text"
      name={path.join('.')}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      autoFocus
      onFocus={(e) => e.target.select()}
    />
  ) : (
    <>
      <span onDoubleClick={() => setIsEditing(true)}>{value}</span>
      {error && <span className="fg-error-slug">{error}</span>}
    </>
  )
}

const OtherComponent: React.FC<{ data: unknown; path: string[] }> = () => {
  return <span>OTHER</span>
}

const EditButtons: React.FC = () => (
  <span>
    <em> Edit buttons</em>
  </span>
)

const InputButtons: React.FC<{ onAccept: Function; onCancel: () => void }> = ({
  onAccept,
  onCancel,
}) => (
  <span>
    <em>
      {' '}
      <span onClick={() => onAccept()}>Accept</span> / <span onClick={onCancel}>Cancel</span>
    </em>
  </span>
)

const getComponent = (value: unknown, path: string[], props: any, key?: string) => {
  if (value === null) return <OtherComponent key={key} data={null} path={path} {...props} />
  if (typeof value === 'string') return <ValueNode key={key} data={value} path={path} {...props} />
  if (typeof value === 'boolean')
    return <OtherComponent key={key} data={value} path={path} {...props} />
  if (typeof value === 'number')
    return <OtherComponent key={key} data={value} path={path} {...props} />
  if (Array.isArray(value)) return <OtherComponent key={key} data={value} path={path} {...props} />
  if (typeof value === 'object') return <ObjectNode key={key} data={value} path={path} {...props} />

  return <OtherComponent data={null} path={path} />
}

export default JsonEditor
