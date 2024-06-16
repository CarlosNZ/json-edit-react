import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  StringValue,
  NumberValue,
  BooleanValue,
  NullValue,
  ObjectValue,
  InvalidValue,
  ArrayValue,
  INVALID_FUNCTION_STRING,
  toPathString,
} from './ValueNodes'
import { EditButtons, InputButtons } from './ButtonPanels'
import {
  DataTypes,
  ERROR_DISPLAY_TIME,
  type DataType,
  type ValueNodeProps,
  type InputProps,
  type CollectionData,
  type ErrorString,
  type ValueData,
  type JerError,
} from './types'
import { useTheme } from './theme'
import './style.css'
import { getCustomNode, type CustomNodeData } from './CustomNode'
import { filterNode } from './filterHelpers'
import { useTreeState } from './TreeStateProvider'

export const ValueNodeWrapper: React.FC<ValueNodeProps> = (props) => {
  const {
    data,
    parentData,
    nodeData,
    onEdit,
    onDelete,
    onChange,
    onError: onErrorCallback,
    showErrorMessages,
    enableClipboard,
    restrictEditFilter,
    restrictDeleteFilter,
    restrictTypeSelection,
    searchFilter,
    searchText,
    showLabel,
    stringTruncate,
    showStringQuotes,
    indent,
    translate,
    customNodeDefinitions,
  } = props
  const { getStyles } = useTheme()
  const { currentlyEditingElement, setCurrentlyEditingElement, setCollapseState } = useTreeState()
  const [value, setValue] = useState<typeof data | CollectionData>(
    // Bad things happen when you put a function into useState
    typeof data === 'function' ? INVALID_FUNCTION_STRING : data
  )
  const [error, setError] = useState<string | null>(null)

  const { key: name, path } = nodeData

  const customNodeData = getCustomNode(customNodeDefinitions, nodeData)
  const [dataType, setDataType] = useState<DataType | string>(getDataType(data, customNodeData))

  const pathString = toPathString(path)

  const updateValue = useCallback(
    (newValue: ValueData) => {
      if (!onChange) {
        setValue(newValue)
        return
      }

      const modifiedValue = onChange({
        currentData: nodeData.fullData,
        newValue,
        currentValue: value as ValueData,
        name,
        path,
      })
      setValue(modifiedValue)
    },
    [onChange]
  )

  useEffect(() => {
    setValue(typeof data === 'function' ? INVALID_FUNCTION_STRING : data)
    setDataType(getDataType(data, customNodeData))
  }, [data, error])

  const canEdit = useMemo(() => !restrictEditFilter(nodeData), [nodeData])
  const canDelete = useMemo(() => !restrictDeleteFilter(nodeData), [nodeData])

  const showError = (errorString: ErrorString) => {
    if (showErrorMessages) {
      setError(errorString)
      setTimeout(() => setError(null), ERROR_DISPLAY_TIME)
    }
    console.warn('Error', errorString)
  }

  const onError = useMemo(
    () => (error: JerError, errorValue: ValueData) => {
      showError(error.message)
      if (onErrorCallback) {
        onErrorCallback({
          currentData: nodeData.fullData,
          errorValue,
          currentValue: value as ValueData,
          name,
          path,
          error,
        })
      }
    },
    [onErrorCallback, showErrorMessages]
  )

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

    const result = restrictTypeSelection(nodeData)

    if (typeof result === 'boolean') return result ? [] : allDataTypes

    return result
  }, [nodeData, restrictTypeSelection])

  // Early return if this node is filtered out
  if (!filterNode('value', nodeData, searchFilter, searchText)) return null

  const handleChangeDataType = (type: DataType) => {
    const customNode = customNodeDefinitions.find((customNode) => customNode.name === type)
    if (customNode) {
      onEdit(customNode.defaultValue, path)
      setDataType(type)
    } else {
      const newValue = convertValue(
        value,
        type,
        translate('DEFAULT_NEW_KEY', nodeData),
        // If coming *FROM* a custom type, need to change value to something
        // that won't match the custom node condition any more
        customNodeData?.CustomNode ? translate('DEFAULT_STRING', nodeData) : undefined
      )
      updateValue(newValue as ValueData)
      onEdit(newValue, path)
      setCollapseState({ path, collapsed: false })
      setDataType(type)
    }
  }

  const handleEdit = () => {
    setCurrentlyEditingElement(null)
    let newValue: ValueData | CollectionData
    switch (dataType) {
      case 'object':
        newValue = { [translate('DEFAULT_NEW_KEY', nodeData)]: value }
        break
      case 'array':
        newValue = value ?? []
        break
      case 'number': {
        const n = Number(value)
        if (isNaN(n)) newValue = 0
        else newValue = n
        break
      }
      default:
        newValue = value
    }
    onEdit(newValue, path).then((error) => {
      if (error) onError({ code: 'UPDATE_ERROR', message: error }, newValue as ValueData)
    })
  }

  const handleEditKey = (newKey: string) => {
    setCurrentlyEditingElement(null)
    if (name === newKey) return
    if (!parentData) return
    const parentPath = path.slice(0, -1)
    const existingKeys = Object.keys(parentData)
    if (existingKeys.includes(newKey)) {
      onError({ code: 'KEY_EXISTS', message: translate('ERROR_KEY_EXISTS', nodeData) }, newKey)
      return
    }

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
    setCurrentlyEditingElement(null)
    setValue(data)
    setDataType(getDataType(data, customNodeData))
  }

  const handleDelete = () => {
    onDelete(value, path).then((error) => {
      if (error) onError({ code: 'DELETE_ERROR', message: error }, value as ValueData)
    })
  }

  // DERIVED VALUES (this makes the JSX logic less messy)
  const isEditing = currentlyEditingElement === pathString
  const isEditingKey = currentlyEditingElement === `key_${pathString}`
  const isArray = typeof path.slice(-1)[0] === 'number'
  const canEditKey = !isArray && canEdit && canDelete
  const showErrorString = !isEditing && error
  const showTypeSelector = isEditing && allowedDataTypes.length > 0
  const showEditButtons = dataType !== 'invalid' && !error && showEditTools
  const showKeyEdit = showLabel && isEditingKey
  const showKey = showLabel && !isEditingKey && !hideKey
  const showCustomNode = CustomNode && ((isEditing && showOnEdit) || (!isEditing && showOnView))

  const inputProps = {
    value,
    parentData,
    setValue: updateValue,
    isEditing,
    setIsEditing: canEdit ? () => setCurrentlyEditingElement(pathString) : () => {},
    handleEdit,
    handleCancel,
    path,
    stringTruncate,
    showStringQuotes,
    nodeData,
    translate,
  }

  const ValueComponent = showCustomNode ? (
    <CustomNode
      {...props}
      value={value}
      customNodeProps={customNodeProps}
      setValue={updateValue}
      handleEdit={handleEdit}
      handleCancel={handleCancel}
      handleKeyPress={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleEdit()
        else if (e.key === 'Escape') handleCancel()
      }}
      isEditing={isEditing}
      setIsEditing={() => setCurrentlyEditingElement(pathString)}
      getStyles={getStyles}
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
        {showKey && (
          <span
            className="jer-key-text"
            style={{
              ...getStyles('property', nodeData),
              minWidth: `${Math.min(String(name).length + 1, 5)}ch`,
              flexShrink: (name as string).length > 10 ? 1 : 0,
            }}
            onDoubleClick={() => canEditKey && setCurrentlyEditingElement(`key_${pathString}`)}
          >
            {name === '' ? (
              <span className="jer-empty-string">
                {/* display "<empty string>" using pseudo class CSS */}
              </span>
            ) : (
              name
            )}
            :
          </span>
        )}
        {showKeyEdit && (
          <input
            className="jer-input-text jer-key-edit"
            type="text"
            name={pathString}
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
            <InputButtons onOk={handleEdit} onCancel={handleCancel} nodeData={nodeData} />
          ) : (
            showEditButtons && (
              <EditButtons
                startEdit={canEdit ? () => setCurrentlyEditingElement(pathString) : undefined}
                handleDelete={canDelete ? handleDelete : undefined}
                enableClipboard={enableClipboard}
                translate={translate}
                nodeData={nodeData}
              />
            )
          )}
          {showTypeSelector && (
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
          {showErrorString && (
            <span className="jer-error-slug" style={getStyles('error', nodeData)}>
              {error}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

const getDataType = (value: unknown, customNodeData?: CustomNodeData) => {
  if (customNodeData?.CustomNode && customNodeData?.name && customNodeData.showInTypesSelector) {
    return customNodeData.name
  }
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

const convertValue = (
  value: unknown,
  type: DataType,
  defaultNewKey: string,
  defaultString?: string
) => {
  switch (type) {
    case 'string':
      return defaultString ?? String(value)
    case 'number': {
      const n = Number(value)
      return isNaN(n) ? 0 : n
    }
    case 'boolean':
      return !!value
    case 'null':
      return null
    case 'object':
      return { [defaultNewKey]: value }
    case 'array':
      return [value]
    default:
      return String(value)
  }
}
