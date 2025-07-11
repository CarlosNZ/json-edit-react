import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  StringValue,
  NumberValue,
  BooleanValue,
  NullValue,
  InvalidValue,
  INVALID_FUNCTION_STRING,
} from './ValueNodes'
import { EditButtons, InputButtons } from './ButtonPanels'
import {
  standardDataTypes,
  type DataType,
  type ValueNodeProps,
  type InputProps,
  type CollectionData,
  type ValueData,
  type JsonData,
  type EnumDefinition,
} from './types'
import { useTheme, useTreeState } from './contexts'
import { type CustomNodeData } from './CustomNode'
import { filterNode, getNextOrPrevious, isJsEvent, matchEnumType } from './helpers'
import { useCommon, useDragNDrop } from './hooks'
import { KeyDisplay } from './KeyDisplay'

export const ValueNodeWrapper: React.FC<ValueNodeProps> = (props) => {
  const {
    data,
    parentData,
    onEdit,
    onDelete,
    onChange,
    onMove,
    enableClipboard,
    canDragOnto,
    restrictTypeSelection,
    searchFilter,
    searchText,
    showLabel,
    stringTruncate,
    showStringQuotes,
    indent,
    translate,
    customNodeDefinitions,
    customNodeData,
    handleKeyboard,
    keyboardControls,
    sort,
    editConfirmRef,
    jsonStringify,
    showIconTooltips,
  } = props
  const { getStyles } = useTheme()
  const {
    setCurrentlyEditingElement,
    setCollapseState,
    previouslyEditedElement,
    setPreviouslyEditedElement,
    tabDirection,
    setTabDirection,
    previousValue,
    setPreviousValue,
  } = useTreeState()
  const [value, setValue] = useState<typeof data | CollectionData>(
    // Bad things happen when you put a function into useState
    typeof data === 'function' ? INVALID_FUNCTION_STRING : data
  )

  const {
    pathString,
    nodeData,
    path,
    name,
    canEdit,
    canDelete,
    canDrag,
    error,
    onError,
    handleEditKey,
    emptyStringKey,
    derivedValues,
  } = useCommon({ props })

  const { dragSourceProps, getDropTargetProps, BottomDropTarget, DropTargetPadding } = useDragNDrop(
    { canDrag, canDragOnto, path, nodeData, onMove, onError, translate }
  )

  const [dataType, setDataType] = useState<DataType | string>(getDataType(data, customNodeData))

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange]
  )

  useEffect(() => {
    setValue(typeof data === 'function' ? INVALID_FUNCTION_STRING : data)
    setDataType(getDataType(data, customNodeData))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, error])

  const {
    CustomNode,
    customNodeProps,
    hideKey,
    showEditTools = true,
    showOnEdit,
    showOnView,
    passOriginalNode,
  } = customNodeData

  // Include custom node options in dataType list
  const allDataTypes = [
    ...standardDataTypes,
    ...customNodeDefinitions
      .filter(({ showInTypesSelector = false, name }) => showInTypesSelector && !!name)
      .map(({ name }) => name as string),
  ]

  const allowedDataTypes = useMemo(() => {
    if (typeof restrictTypeSelection === 'boolean') return restrictTypeSelection ? [] : allDataTypes

    if (Array.isArray(restrictTypeSelection)) return restrictTypeSelection

    const result = restrictTypeSelection(nodeData)

    if (typeof result === 'boolean') return result ? [] : allDataTypes

    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeData, restrictTypeSelection])

  const [enumType, setEnumType] = useState<EnumDefinition | null>(
    matchEnumType(value, allowedDataTypes)
  )

  const { isEditing } = derivedValues

  // Early return if this node is filtered out
  const isVisible = filterNode('value', nodeData, searchFilter, searchText)

  // This prevents hidden or uneditable nodes being set to editing via Tab
  // navigation
  if (isEditing && (!isVisible || !canEdit)) {
    const next = getNextOrPrevious(nodeData.fullData, path, tabDirection, sort)
    if (next) setCurrentlyEditingElement(next)
    else setCurrentlyEditingElement(previouslyEditedElement)
  }

  if (!isVisible) return null

  const handleChangeDataType = (type: DataType) => {
    const customNode = customNodeDefinitions.find((customNode) => customNode.name === type)
    if (customNode) {
      onEdit(customNode.defaultValue, path)
      setDataType(type)
      setEnumType(null)
      // Custom nodes will be instantiated expanded and NOT editing
      setCurrentlyEditingElement(null)
      setCollapseState({ path, collapsed: false, includeChildren: false })
      return
    }

    const enumType = allowedDataTypes.find((dt) => {
      if (dt instanceof Object) return dt.enum === type
      return false
    }) as EnumDefinition | undefined
    if (enumType) {
      if (typeof value !== 'string' || !enumType.values.includes(value))
        onEdit(enumType.values[0], path).then((error) => {
          if (error) {
            onError({ code: 'UPDATE_ERROR', message: error }, newValue as JsonData)
            setCurrentlyEditingElement(null)
          }
        })
      setEnumType(enumType)
      return
    }

    const newValue = convertValue(
      value,
      type,
      translate('DEFAULT_NEW_KEY', nodeData),
      // If coming *FROM* a custom type, need to change value to something
      // that won't match the custom node condition any more
      customNodeData?.CustomNode ? translate('DEFAULT_STRING', nodeData) : undefined
    )
    onEdit(newValue, path).then((error) => {
      if (error) {
        onError({ code: 'UPDATE_ERROR', message: error }, newValue as JsonData)
        setCurrentlyEditingElement(null)
      } else setEnumType(null)
    })
  }

  const handleEdit = (inputValue?: unknown) => {
    setCurrentlyEditingElement(null)
    setPreviousValue(null)
    let newValue: JsonData
    if (inputValue !== undefined && !isJsEvent(inputValue)) newValue = inputValue as JsonData
    else {
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
    }
    onEdit(newValue, path).then((error) => {
      if (error) onError({ code: 'UPDATE_ERROR', message: error }, newValue)
    })
  }

  const handleCancel = () => {
    setCurrentlyEditingElement(null)
    if (previousValue !== null) {
      onEdit(previousValue, path)
      return
    }
    setValue(data)
    setPreviousValue(null)
  }

  const handleDelete = () => {
    onDelete(value, path).then((error) => {
      if (error) onError({ code: 'DELETE_ERROR', message: error }, value as ValueData)
    })
  }

  // DERIVED VALUES (this makes the JSX logic less messy)
  const { isEditingKey, canEditKey } = derivedValues
  const showErrorString = !isEditing && error
  const showTypeSelector = isEditing && allowedDataTypes.length > 1
  const showEditButtons = (dataType !== 'invalid' || CustomNode) && !error && showEditTools
  const showKey = showLabel && !hideKey
  const showCustomNode = CustomNode && ((isEditing && showOnEdit) || (!isEditing && showOnView))

  const inputProps = {
    value,
    parentData,
    setValue: updateValue,
    isEditing,
    canEdit,
    setIsEditing: canEdit ? () => setCurrentlyEditingElement(path) : () => {},
    handleEdit,
    handleCancel,
    path,
    stringTruncate,
    showStringQuotes,
    nodeData,
    enumType,
    translate,
    handleKeyboard,
    keyboardCommon: {
      cancel: handleCancel,
      tabForward: () => {
        setTabDirection('next')
        setPreviouslyEditedElement(pathString)
        const next = getNextOrPrevious(nodeData.fullData, path, 'next', sort)
        if (next) {
          handleEdit()
          setCurrentlyEditingElement(next)
        }
      },
      tabBack: () => {
        setTabDirection('prev')
        setPreviouslyEditedElement(pathString)
        const prev = getNextOrPrevious(nodeData.fullData, path, 'prev', sort)
        if (prev) {
          handleEdit()
          setCurrentlyEditingElement(prev)
        }
      },
    },
  }

  const keyDisplayProps = {
    canEditKey,
    isEditingKey,
    pathString,
    path,
    name: name as string,
    handleKeyboard,
    handleEditKey,
    handleCancel,
    styles: getStyles('property', nodeData),
    getNextOrPrevious: (type: 'next' | 'prev') =>
      getNextOrPrevious(nodeData.fullData, path, type, sort),
    emptyStringKey,
  }

  const ValueComponent = showCustomNode ? (
    <CustomNode
      {...props}
      value={value}
      customNodeProps={customNodeProps}
      setValue={updateValue}
      handleEdit={handleEdit}
      handleCancel={handleCancel}
      handleKeyPress={(e: React.KeyboardEvent) =>
        handleKeyboard(e, { stringConfirm: handleEdit, cancel: handleCancel })
      }
      isEditing={isEditing}
      setIsEditing={() => setCurrentlyEditingElement(path)}
      getStyles={getStyles}
      originalNode={passOriginalNode ? getInputComponent(data, inputProps) : undefined}
      originalNodeKey={passOriginalNode ? <KeyDisplay {...keyDisplayProps} /> : undefined}
      canEdit={canEdit}
      keyboardCommon={inputProps.keyboardCommon}
      onError={onError}
    />
  ) : (
    // Need to re-fetch data type to make sure it's one of the "core" ones
    // when fetching a non-custom component
    getInputComponent(data, inputProps)
  )

  return (
    <div
      className="jer-component jer-value-component"
      style={{
        marginLeft: parentData !== null ? `${indent / 2}em` : 0,
        position: 'relative',
      }}
      draggable={canDrag}
      {...dragSourceProps}
      {...getDropTargetProps('above')}
    >
      {BottomDropTarget}
      <DropTargetPadding position="above" nodeData={nodeData} />
      <div
        className="jer-value-main-row"
        style={{
          flexWrap: (name as string).length > 10 ? 'wrap' : 'nowrap',
        }}
      >
        {showKey && <KeyDisplay {...keyDisplayProps} />}
        <div className="jer-value-and-buttons">
          <div className="jer-input-component">{ValueComponent}</div>
          {isEditing ? (
            <InputButtons
              onOk={handleEdit}
              onCancel={handleCancel}
              nodeData={nodeData}
              editConfirmRef={editConfirmRef}
            />
          ) : (
            showEditButtons && (
              <EditButtons
                startEdit={
                  canEdit
                    ? () => {
                        setPreviousValue(previousValue)
                        setCurrentlyEditingElement(path, handleCancel)
                      }
                    : undefined
                }
                handleDelete={canDelete ? handleDelete : undefined}
                enableClipboard={enableClipboard}
                translate={translate}
                customButtons={props.customButtons}
                nodeData={nodeData}
                handleKeyboard={handleKeyboard}
                keyboardControls={keyboardControls}
                editConfirmRef={editConfirmRef}
                jsonStringify={jsonStringify}
                showIconTooltips={showIconTooltips}
              />
            )
          )}
          {showTypeSelector && (
            <div className="jer-select jer-select-types">
              <select
                name={`${name}-type-select`}
                className="jer-select-inner"
                onChange={(e) => handleChangeDataType(e.target.value as DataType)}
                value={enumType ? enumType.enum : dataType}
              >
                {allowedDataTypes.map((type) => {
                  if (type instanceof Object && 'enum' in type) {
                    return (
                      <option value={type.enum} key={type.enum}>
                        {type.enum}
                      </option>
                    )
                  }
                  return (
                    <option value={type} key={type}>
                      {type}
                    </option>
                  )
                })}
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
      <DropTargetPadding position="below" nodeData={nodeData} />
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

const getInputComponent = (data: JsonData, inputProps: InputProps) => {
  // Need to check for DataType again -- if it's a custom component it could
  // have a custom type, but if we're rendering this (a standard component),
  // then it must be set to not show in current condition (editing or view), so
  // we need interpret it as a simple type, not the Custom type.
  const rawDataType = getDataType(data)
  const { value } = inputProps
  switch (rawDataType) {
    case 'string':
      return <StringValue {...inputProps} value={value as string} />
    case 'number':
      return <NumberValue {...inputProps} value={value as number} />
    case 'boolean':
      return <BooleanValue {...inputProps} value={value as boolean} />
    case 'null':
      return <NullValue {...inputProps} />
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
