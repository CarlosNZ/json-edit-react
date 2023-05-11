import { useState } from 'react'
import { DataTypes, DataType, ObjectNodeProps, ValueNodeProps, InputProps } from './types'
import './style.css'

export const ObjectNode: React.FC<ObjectNodeProps> = ({ data, path, ...props }) => {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="fg-component fb-object-component">
      <div className="fg-object-header-row">
        <div onClick={() => setCollapsed(!collapsed)}>X</div>
        <div>
          <strong>{`${props.name} {`}</strong>
        </div>
        <div>Item count</div>
        {collapsed && <div>{'}'}</div>}
        <div>Edit buttons</div>
      </div>

      {!collapsed && (
        <div className="fg-object-inner">
          {Object.entries(data)
            // TO-DO: Sort keys if "keySort" prop specified
            .map(([key, value]) => (
              <div className="fg-object-element">
                {getComponent(value, [...path, key], { ...props, name: key }, key)}
              </div>
            ))}
          <div>{'}'}</div>
        </div>
      )}
    </div>
  )
}

export const ValueNode: React.FC<ValueNodeProps> = ({ data, name, path, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(data)
  const [error, setError] = useState<string | null>(null)
  const [dataType, setDataType] = useState<DataType>('string')

  const handleEdit = () => {
    setIsEditing(false)
    onEdit(value, path).then((result: any) => {
      if (result) {
        setError(result)
        setTimeout(() => setError(null), 3000)
        console.log('Error', result)
      }
    })
  }

  const handleCancel = () => {
    setIsEditing(false)
    setValue(data)
  }

  const inputProps = {
    value,
    setValue,
    isEditing,
    setIsEditing,
    handleEdit,
    handleCancel,
    path,
  }

  return (
    <div className="fg-component fg-value-component">
      <div className="fg-value-main-row">
        <label htmlFor={path.join('.')}>{name}: </label>
        {getInputComponent(dataType, inputProps)}
        {isEditing ? (
          <InputButtons onAccept={handleEdit} onCancel={handleCancel} />
        ) : (
          <EditButtons />
        )}
        {isEditing && (
          <select
            name={`${name}-type-select`}
            onChange={(e) => setDataType(e.target.value as DataType)}
          >
            {DataTypes.map((type) => (
              <option value={type}>{type}</option>
            ))}
          </select>
        )}
      </div>
      <div className="fg-value-error-row">
        {error && <span className="fg-error-slug">{error}</span>}
      </div>
    </div>
  )
}

export const StringValue: React.FC<InputProps> = ({
  value,
  setValue,
  isEditing,
  path,
  setIsEditing,
  handleEdit,
  handleCancel,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEdit()
    else if (e.key === 'Escape') handleCancel()
  }

  return isEditing ? (
    <input
      className="fg-text-input"
      type="text"
      name={path.join('.')}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      autoFocus
      onFocus={(e) => e.target.select()}
      onKeyDown={handleKeyPress}
    />
  ) : (
    <span onDoubleClick={() => setIsEditing(true)}>{value}</span>
  )
}

export const OtherComponent: React.FC<{ data: unknown; path: string[] }> = () => {
  return <span>OTHER</span>
}

export const EditButtons: React.FC = () => (
  <span>
    <em> Edit buttons</em>
  </span>
)

export const InputButtons: React.FC<{ onAccept: Function; onCancel: () => void }> = ({
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

const getInputComponent = (dataType: DataType, inputProps: InputProps) => {
  switch (dataType) {
    case 'string':
      return <StringValue {...inputProps} />
    case 'number':
    case 'boolean':
    case 'null':
    default:
      return <p>Other types</p>
  }
}

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
