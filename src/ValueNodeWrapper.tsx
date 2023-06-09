import React, { useEffect, useState, useMemo } from 'react'
import {
  StringValue,
  NumberValue,
  BooleanValue,
  NullValue,
  ObjectValue,
  InvalidValue,
  ArrayValue,
  INVALID_FUNCTION_STRING,
} from './ValueNodes'
import { EditButtons, InputButtons } from './ButtonPanels'
import {
  DataType,
  ValueNodeProps,
  InputProps,
  DataTypes,
  CollectionData,
  ErrorString,
  ERROR_DISPLAY_TIME,
} from './types'
import { useTheme } from './theme'
import './style.css'

export const ValueNodeWrapper: React.FC<ValueNodeProps> = ({
  data,
  name,
  path,
  onEdit,
  onDelete,
  enableClipboard,
  restrictEditFilter,
  restrictDeleteFilter,
  showArrayIndices,
  stringTruncate,
  indent,
  translate,
}) => {
  const { styles } = useTheme()
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState<typeof data | CollectionData>(
    // Bad things happen when you put a function into useState
    typeof data === 'function' ? INVALID_FUNCTION_STRING : data
  )
  const [error, setError] = useState<string | null>(null)
  const [dataType, setDataType] = useState<DataType>(getDataType(data))

  useEffect(() => {
    setValue(typeof data === 'function' ? INVALID_FUNCTION_STRING : data)
    setDataType(getDataType(data))
  }, [data, error])

  const handleChangeDataType = (type: DataType) => {
    setValue(convertValue(value, type))
    setDataType(type)
  }

  const logError = (errorString: ErrorString) => {
    setError(errorString)
    setTimeout(() => setError(null), ERROR_DISPLAY_TIME)
    console.log('Error', errorString)
  }

  const handleEdit = () => {
    setIsEditing(false)
    let newValue
    switch (dataType) {
      case 'object':
        newValue = {}
        break
      case 'array':
        newValue = value !== null ? [value] : []
        break
      case 'number':
        const n = Number(value)
        if (isNaN(n)) newValue = 0
        else newValue = n
        break
      default:
        newValue = value
    }
    onEdit(newValue, path).then((error) => {
      if (error) logError(error)
    })
  }

  const handleCancel = () => {
    setIsEditing(false)
    setValue(data)
  }

  const handleDelete = () => {
    onDelete(value, path).then((error) => {
      if (error) logError(error)
    })
  }

  const filterProps = { key: name, path, level: path.length, value: data, size: null }

  const canEdit = useMemo(() => !restrictEditFilter(filterProps), [filterProps])
  const canDelete = useMemo(() => !restrictDeleteFilter(filterProps), [filterProps])

  const inputProps = {
    value,
    setValue,
    isEditing,
    setIsEditing: canEdit ? () => setIsEditing(true) : () => {},
    handleEdit,
    handleCancel,
    path,
    stringTruncate,
  }

  return (
    <div className="jer-component jer-value-component" style={{ marginLeft: `${indent / 2}em` }}>
      <div
        className="jer-value-main-row"
        style={{
          flexWrap: (name as string).length > 10 ? 'wrap' : 'nowrap',
        }}
      >
        {showArrayIndices && (
          <label
            htmlFor={path.join('.')}
            className="jer-object-key"
            style={{
              ...styles.property,
              minWidth: `${Math.min(String(name).length + 1, 5)}ch`,
              flexShrink: (name as string).length > 10 ? 1 : 0,
            }}
          >
            {name}:{' '}
          </label>
        )}
        <div className="jer-value-and-buttons">
          <div className="jer-input-component">{getInputComponent(dataType, inputProps)}</div>
          {isEditing ? (
            <InputButtons onOk={handleEdit} onCancel={handleCancel} />
          ) : (
            dataType !== 'invalid' &&
            !error && (
              <EditButtons
                startEdit={canEdit ? () => setIsEditing(true) : undefined}
                handleDelete={canDelete ? handleDelete : undefined}
                data={data}
                enableClipboard={enableClipboard}
                name={name}
                path={path}
                translate={translate}
              />
            )
          )}
          {isEditing && (
            <div className="jer-select">
              <select
                name={`${name}-type-select`}
                className="jer-type-select"
                onChange={(e) => handleChangeDataType(e.target.value as DataType)}
                value={dataType}
              >
                {DataTypes.map((type) => (
                  <option value={type} key={type}>
                    {type}
                  </option>
                ))}
              </select>
              <span className="focus"></span>
            </div>
          )}
          {!isEditing && error && (
            <span className="jer-error-slug" style={styles.error}>
              {error}
            </span>
          )}
        </div>
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
  const value = inputProps.value
  switch (dataType) {
    case 'string':
      return <StringValue {...inputProps} value={value as string} />
    case 'number':
      return <NumberValue {...inputProps} value={value as number} />
    case 'boolean':
      return <BooleanValue {...inputProps} value={value as boolean} />
    case 'null':
      return <NullValue {...inputProps} />
    case 'object':
      return <ObjectValue {...inputProps} />
    case 'array':
      return <ArrayValue {...inputProps} />
    default:
      return <InvalidValue {...inputProps} />
  }
}

const convertValue = (value: unknown, type: DataType) => {
  switch (type) {
    case 'string':
      return String(value)
    case 'number':
      const n = Number(value)
      return isNaN(n) ? 0 : n
    case 'boolean':
      return !!value
    case 'null':
      return null
    case 'object':
      return {}
    case 'array':
      return [value]
    default:
      return String(value)
  }
}
