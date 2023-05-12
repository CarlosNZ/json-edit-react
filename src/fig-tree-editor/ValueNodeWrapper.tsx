import { useEffect, useState } from 'react'
import { StringValue, NumberValue, BooleanValue, NullValue, ObjectValue } from './ValueNodes'
import { EditButtons, InputButtons } from './ButtonPanels'
import { DataType, ValueNodeProps, InputProps, DataTypes } from './types'
import './style.css'

export const ValueNodeWrapper: React.FC<ValueNodeProps> = ({
  data,
  name,
  path,
  onEdit,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(data)
  const [error, setError] = useState<string | null>(null)
  const [dataType, setDataType] = useState<DataType>(getDataType(data))

  useEffect(() => {
    setValue(data)
  }, [data])

  const handleEdit = () => {
    setIsEditing(false)
    const newValue = dataType === 'object' ? {} : value
    onEdit(newValue, path).then((result: any) => {
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

  const handleDelete = () => {
    onDelete(value, path).then((result: any) => {
      if (result) {
        setError(result)
        setTimeout(() => setError(null), 3000)
        console.log('Error', result)
      }
    })
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
        <label htmlFor={path.join('.')} className="fg-object-key">
          {name}:{' '}
        </label>
        <div className="fg-input-component">{getInputComponent(dataType, inputProps)}</div>
        {isEditing ? (
          <InputButtons onOk={handleEdit} onCancel={handleCancel} />
        ) : (
          <EditButtons startEdit={() => setIsEditing(true)} handleDelete={handleDelete} />
        )}
        {isEditing && (
          <select
            name={`${name}-type-select`}
            onChange={(e) => setDataType(e.target.value as DataType)}
            value={dataType}
          >
            {DataTypes.map((type) => (
              <option value={type} key={type}>
                {type}
              </option>
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

const getDataType = (value: unknown) => {
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value === null) return 'null'
  return 'invalid'
}

const getInputComponent = (dataType: DataType, inputProps: InputProps) => {
  console.log(inputProps.value, dataType)
  switch (dataType) {
    case 'string':
      return <StringValue {...inputProps} />
    case 'number':
      return <NumberValue {...inputProps} />
    case 'boolean':
      return <BooleanValue {...inputProps} />
    case 'null':
      return <NullValue {...inputProps} />
    case 'object':
      return <ObjectValue {...inputProps} />
    default:
      return <p>Other types</p>
  }
}
