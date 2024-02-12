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
import { CustomNodeData, getCustomNode } from './CustomNode'

export const ValueNodeWrapper: React.FC<ValueNodeProps> = (props) => {
  const {
    data,
    parentData,
    nodeData,
    onEdit,
    onDelete,
    enableClipboard,
    restrictEditFilter,
    restrictDeleteFilter,
    restrictTypeSelection,
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

  const { key: name, path } = nodeData

  const customNodeData = getCustomNode(customNodeDefinitions, nodeData)
  const [dataType, setDataType] = useState<DataType | string>(getDataType(data, customNodeData))

  useEffect(() => {
    setValue(typeof data === 'function' ? INVALID_FUNCTION_STRING : data)
    setDataType(getDataType(data, customNodeData))
  }, [data, error])

  const handleChangeDataType = (type: DataType) => {
    const customNode = customNodeDefinitions.find((customNode) => customNode.name === type)
    if (customNode) {
      onEdit(customNode.defaultValue, path)
      setDataType(type)
    } else {
      const newValue = convertValue(
        value,
        type,
        // If coming *FROM* a custom type, need to change value to something
        // that won't match the custom node condition any more
        customNodeData?.CustomNode ? translate('DEFAULT_STRING', nodeData) : undefined
      )
      setValue(newValue)
      onEdit(newValue, path)
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
        newValue = { [translate('DEFAULT_NEW_KEY', nodeData)]: value }
        break
      case 'array':
        newValue = value !== null ? value : []
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
    setDataType(getDataType(data, customNodeData))
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
    nodeData,
    translate,
  }

  const {
    CustomNode,
    customNodeProps,
    hideKey,
    showEditTools = true,
    showOnEdit,
    showOnView,
  } = customNodeData

  // Include custom node options in dataType list
  const allDataTypes = [
    ...DataTypes,
    ...customNodeDefinitions
      .filter(({ showInTypesSelector = false, name }) => showInTypesSelector && !!name)
      .map(({ name }) => name),
  ]

  const allowedDataTypes = useMemo(() => {
    if (typeof restrictTypeSelection === 'boolean') return restrictTypeSelection ? [] : allDataTypes

    if (Array.isArray(restrictTypeSelection)) return restrictTypeSelection

    const result = restrictTypeSelection(filterProps)

    if (typeof result === 'boolean') return result ? [] : allDataTypes

    return result
  }, [filterProps, restrictTypeSelection])

  const ValueComponent =
    CustomNode && ((isEditing && showOnEdit) || (!isEditing && showOnView)) ? (
      <CustomNode
        {...props}
        value={value}
        customNodeProps={customNodeProps}
        setValue={setValue}
        handleEdit={handleEdit}
        handleCancel={handleCancel}
        handleKeyPress={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter') handleEdit()
          else if (e.key === 'Escape') handleCancel()
        }}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        styles={styles}
      />
    ) : (
      // Need to re-fetch data type to make sure it's one of the "core" ones
      // when fetching a non-custom component
      getInputComponent(getDataType(data) as DataType, inputProps)
    )

  return (
    <div className="jer-component jer-value-component" style={{ marginLeft: `${indent / 2}em` }}>
      <div
        className="jer-value-main-row"
        style={{
          flexWrap: (name as string).length > 10 ? 'wrap' : 'nowrap',
        }}
      >
        {showLabel && !isEditingKey && !hideKey && (
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
          <div className="jer-input-component">{ValueComponent}</div>
          {isEditing ? (
            <InputButtons onOk={handleEdit} onCancel={handleCancel} />
          ) : (
            dataType !== 'invalid' &&
            !error &&
            showEditTools && (
              <EditButtons
                startEdit={canEdit ? () => setIsEditing(true) : undefined}
                handleDelete={canDelete ? handleDelete : undefined}
                enableClipboard={enableClipboard}
                translate={translate}
                nodeData={nodeData}
              />
            )
          )}
          {isEditing && allowedDataTypes.length > 0 && (
            <div className="jer-select">
              <select
                name={`${name}-type-select`}
                className="jer-type-select"
                onChange={(e) => handleChangeDataType(e.target.value as DataType)}
                value={dataType}
              >
                {allowedDataTypes.map((type) => (
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

const getDataType = (value: unknown, customNodeData?: CustomNodeData) => {
  if (customNodeData?.CustomNode && customNodeData?.name && customNodeData.showInTypesSelector)
    return customNodeData.name
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
      return <ObjectValue {...inputProps} value={value} />
    case 'array':
      return <ArrayValue {...inputProps} />
    default:
      return <InvalidValue {...inputProps} />
  }
}

const convertValue = (value: unknown, type: DataType, defaultString?: string) => {
  switch (type) {
    case 'string':
      return defaultString ?? String(value)
    case 'number':
      const n = Number(value)
      return isNaN(n) ? 0 : n
    case 'boolean':
      return !!value
    case 'null':
      return null
    case 'object':
      return value as any
    case 'array':
      return [value]
    default:
      return String(value)
  }
}
