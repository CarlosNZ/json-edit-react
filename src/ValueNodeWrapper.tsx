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
import { getCustomNode } from './helpers'
import { CustomNodeWrapper } from './CustomNodeWrapper'

export const ValueNodeWrapper: React.FC<ValueNodeProps> = (props) => {
  const {
    data,
    parentData,
    name,
    path,
    onEdit,
    onDelete,
    enableClipboard,
    restrictEditFilter,
    restrictDeleteFilter,
    showLabel,
    stringTruncate,
    indent,
    translate,
    customNodeDefinitions,
  } = props
  const { styles } = useTheme()
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingKey, setIsEditingKey] = useState(false)
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
    const customNode = customNodeDefinitions.find((customNode) => customNode.name === type)
    if (customNode) {
      onEdit(customNode.defaultValue, path)
    } else {
      setValue(convertValue(value, type))
      setDataType(type)
    }
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

  const handleEditKey = (newKey: string) => {
    setIsEditingKey(false)
    if (!parentData) return
    const parentPath = path.slice(0, -1)
    if (!newKey) return

    // Need to update data in array form to preserve key order
    const newData = Object.fromEntries(
      Object.entries(parentData).map(([key, val]) => (key === name ? [newKey, val] : [key, val]))
    )
    onEdit(newData, parentPath)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditKey((e.target as HTMLInputElement).value)
    else if (e.key === 'Escape') handleCancel()
  }

  const handleCancel = () => {
    setIsEditing(false)
    setIsEditingKey(false)
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

  const isArray = typeof path.slice(-1)[0] === 'number'
  const canEditKey = !isArray && canEdit && canDelete

  const inputProps = {
    value,
    parentData,
    setValue,
    isEditing,
    setIsEditing: canEdit ? () => setIsEditing(true) : () => {},
    handleEdit,
    handleCancel,
    path,
    stringTruncate,
  }

  const { CustomNode, customNodeProps, hideKey } = getCustomNode(customNodeDefinitions, {
    key: name,
    path,
    level: path.length,
    value: data,
    size: 0,
  })

  // Include custom node options in dataType list
  const dataTypes = [
    ...customNodeDefinitions
      .filter(({ showInTypesSelector = false }) => showInTypesSelector)
      .map(({ name }) => name),
    ...DataTypes,
  ]

  return CustomNode ? (
    <CustomNodeWrapper name={name} hideKey={hideKey} indent={indent}>
      <CustomNode customProps={customNodeProps} {...props} />
    </CustomNodeWrapper>
  ) : (
    <div className="jer-component jer-value-component" style={{ marginLeft: `${indent / 2}em` }}>
      <div
        className="jer-value-main-row"
        style={{
          flexWrap: (name as string).length > 10 ? 'wrap' : 'nowrap',
        }}
      >
        {showLabel && !isEditingKey && (
          <label
            htmlFor={path.join('.')}
            className="jer-object-key"
            style={{
              ...styles.property,
              minWidth: `${Math.min(String(name).length + 1, 5)}ch`,
              flexShrink: (name as string).length > 10 ? 1 : 0,
            }}
            onDoubleClick={() => canEditKey && setIsEditingKey(true)}
          >
            {name}:{' '}
          </label>
        )}
        {showLabel && isEditingKey && (
          <input
            className="jer-object-key"
            type="text"
            name={path.join('.')}
            defaultValue={name}
            autoFocus
            onFocus={(e) => e.target.select()}
            onKeyDown={handleKeyPress}
            style={{ width: `${String(name).length / 1.5 + 0.5}em` }}
          />
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
                {dataTypes.map((type) => (
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
