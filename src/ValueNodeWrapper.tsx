import React, { useEffect, useLayoutEffect, useState, useMemo, useCallback, useRef } from 'react'
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
import { useTheme, useEditingStore, useCollapse } from './contexts'
import { type CustomNodeData } from './CustomNode'
import { filterNode } from './utils/filter'
import { getNextOrPrevious } from './utils/keyboard'
import { isJsEvent, matchEnumType, NOOP } from './utils/misc'
import { useCommon, useDragNDrop } from './hooks'
import { KeyDisplay } from './KeyDisplay'
import { areNodePropsEqual } from './utils/memoNode'

const ValueNodeWrapperBase: React.FC<ValueNodeProps> = (props) => {
  const {
    data,
    parentData,
    onEdit,
    onDelete,
    onChange,
    onMove,
    allowClipboard,
    onCopy,
    canDragOnto,
    restrictTypeSelection,
    searchFilter,
    searchText,
    showLabel,
    stringTruncate,
    showStringQuotes,
    arrayIndexFromOne,
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
    getLatestData,
  } = props
  const { getStyles } = useTheme()
  // Actions + a getSnapshot for imperative reads. The editing *state* this node
  // needs (tabDirection, previouslyEditedElement, previousValue) is only read
  // inside event handlers / the Tab-redirect effect — never during render — so
  // it's read from the snapshot at use-time rather than subscribed to. The only
  // editing state that drives this node's render (`isEditing`) comes from
  // `useCommon`'s per-node selector.
  const { startEdit, cancelEdit, recordPreviousEdit, setTabDirection, setPreviousValue, getSnapshot } =
    useEditingStore()
  const { setCollapseState } = useCollapse()
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

  // `updateValue` keeps a stable identity (it's handed to a custom node as
  // `setValue`, and `nodeData`'s identity churns every render), so it can't
  // close over `value`/`nodeData` — once `onChange` is stabilized upstream the
  // closure would freeze. Read the in-progress value and the node's `NodeData`
  // from refs-to-latest, and the live document from `getLatestData()`.
  const onChangeArgsRef = useRef({ value, name, path })
  onChangeArgsRef.current = { value, name, path }
  const nodeDataRef = useRef(nodeData)
  nodeDataRef.current = nodeData
  const updateValue = useCallback(
    (newValue: ValueData) => {
      if (!onChange) {
        setValue(newValue)
        return
      }
      // Flat `NodeData` payload (§17): `value` is the current (pre-keystroke)
      // value, `fullData` the live document; the rest comes from `nodeData`.
      const modifiedValue = onChange({
        ...nodeDataRef.current,
        value: onChangeArgsRef.current.value as ValueData,
        fullData: getLatestData(),
        newValue,
      })
      setValue(modifiedValue)
    },
    [onChange, getLatestData]
  )

  // Snap the local edit buffer (`value` + `dataType`) back to the committed
  // `data`. The effect handles `data` changing from ANY source (external
  // `setData`, undo, a parent re-render); reject/cancel call it explicitly
  // (below) since neither changes `data`, so a non-committing edit never leaves
  // the input showing the typed-but-discarded value.
  const revertToData = () => {
    setValue(typeof data === 'function' ? INVALID_FUNCTION_STRING : data)
    setDataType(getDataType(data, customNodeData))
  }

  useEffect(() => {
    revertToData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

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

  // Skip hidden or uneditable nodes that Tab navigation has landed on by
  // advancing the editing target to the next viable node.
  //
  // `useLayoutEffect` (not `useEffect`) is load-bearing: it fires synchronously
  // before the browser paints, so the redirect state update batches into the
  // same paint as the commit that flagged this node as `isEditing`. With plain
  // `useEffect` the user would see a flicker — the current node briefly
  // closes its editor (commit 1 with the filtered-out target "editing"),
  // then reopens (commit 2 after the redirect). See V2-roadmap §16 for the
  // followup: hoisting filter-awareness into `getNextOrPrevious` so the Tab
  // handler can pick a viable target up front, eliminating the redirect
  // entirely and dropping the setState-after-render pattern.
  useLayoutEffect(() => {
    if (!isEditing) return
    if (isVisible && canEdit) return
    // A forced (imperative `editorRef.startEdit`) edit overrides `restrictEdit`,
    // so don't bounce off this node just because it's normally uneditable. A
    // search-filtered-out node (`!isVisible`) still redirects — it can't render.
    if (isVisible && getSnapshot().currentlyEditingElement?.force) return
    const { tabDirection, previouslyEditedElement } = getSnapshot()
    const next = getNextOrPrevious(getLatestData(), path, tabDirection, sort)
    if (next) startEdit(next)
    else if (previouslyEditedElement) startEdit(previouslyEditedElement)
    else cancelEdit()
    // The three booleans gate the redirect; `startEdit`/`cancelEdit` are
    // included for hygiene (they are useCallback-stable over `onEditEvent`
    // in EditingProvider, so they almost never flip). The remaining reads
    // (`nodeData.fullData`, `tabDirection`, `previouslyEditedElement`,
    // `path`, `sort`) are intentionally excluded — they change on every
    // render or every edit transition and would cause spurious re-fires
    // when no redirect is needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, isVisible, canEdit, startEdit, cancelEdit])

  if (!isVisible) return null

  const handleChangeDataType = (type: DataType) => {
    // Contract #3: user-action clears broadcast. See CollapseProvider top-of-file doc.
    setCollapseState(null)
    // Snapshot the original value before any type-change `onEdit` fires, so
    // a subsequent cancel can revert. Gated on `previousValue === null` so a
    // chain of type changes within one edit session still reverts to the
    // *original* — subsequent changes don't overwrite the first snapshot.
    if (getSnapshot().previousValue === null) setPreviousValue(value as JsonData)
    const customNode = customNodeDefinitions.find((customNode) => customNode.name === type)
    if (customNode) {
      onEdit(customNode.defaultValue, path)
      setDataType(type)
      setEnumType(null)
      // Custom nodes will be instantiated expanded and NOT editing
      cancelEdit()
      setCollapseState({ path, collapsed: false, includeChildren: false })
      return
    }

    const enumType = allowedDataTypes.find((dt) => {
      if (dt instanceof Object) return dt.enum === type
      return false
    }) as EnumDefinition | undefined
    if (enumType) {
      if (typeof value !== 'string' || !enumType.values.includes(value)) {
        const attempted = enumType.values[0]
        onEdit(attempted, path).then((result) => {
          if (result === false) revertToData()
          else if (result) {
            // `attempted` rather than `newValue` — `newValue` is declared
            // further down in this function and is never reached on this
            // branch (we return at `setEnumType` below), so referencing it
            // from this callback would throw a TDZ ReferenceError.
            onError({ code: 'UPDATE_ERROR', message: result }, attempted as JsonData)
            cancelEdit()
            revertToData()
          }
        })
      }
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
    if (!['string', 'number', 'boolean'].includes(type)) cancelEdit()
    onEdit(newValue, path).then((result) => {
      if (result === false) revertToData()
      else if (result) {
        onError({ code: 'UPDATE_ERROR', message: result }, newValue as JsonData)
        cancelEdit()
        revertToData()
      } else setEnumType(null)
    })
  }

  const handleEdit = (inputValue?: unknown) => {
    cancelEdit()
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
    onEdit(newValue, path).then((result) => {
      if (result === false) revertToData()
      else if (result) {
        onError({ code: 'UPDATE_ERROR', message: result }, newValue)
        revertToData()
      }
    })
  }

  const handleCancel = () => {
    cancelEdit()
    const previousValue = getSnapshot().previousValue
    if (previousValue !== null) {
      onEdit(previousValue, path)
      // Clear the snapshot after applying it — otherwise it lingers in
      // editing state and a later cancel (here or on another node) would
      // see a non-null `previousValue` and trigger an unintended revert.
      setPreviousValue(null)
      return
    }
    revertToData()
    setPreviousValue(null)
  }

  const handleDelete = () => {
    // `result === false` is a silent cancel (consumer returned `null`); a
    // non-empty string is a real error. Neither edits this node's value buffer.
    onDelete(value, path).then((result) => {
      if (result) onError({ code: 'DELETE_ERROR', message: result }, value as ValueData)
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
    setIsEditing: canEdit ? () => startEdit(path) : NOOP,
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
        recordPreviousEdit(path)
        const next = getNextOrPrevious(getLatestData(), path, 'next', sort)
        if (next) {
          handleEdit()
          startEdit(next)
        }
      },
      tabBack: () => {
        setTabDirection('prev')
        recordPreviousEdit(path)
        const prev = getNextOrPrevious(getLatestData(), path, 'prev', sort)
        if (prev) {
          handleEdit()
          startEdit(prev)
        }
      },
    },
  }

  const keyDisplayProps = {
    canEditKey,
    isEditingKey,
    pathString,
    path,
    name,
    arrayIndexFromOne,
    handleKeyboard,
    handleEditKey,
    handleCancel,
    styles: getStyles('property', nodeData),
    getNextOrPrevious: (type: 'next' | 'prev') =>
      getNextOrPrevious(getLatestData(), path, type, sort),
    emptyStringKey,
    nodeData,
    customNodeData,
    getStyles,
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
      setIsEditing={() => startEdit(path)}
      getStyles={getStyles}
      originalNode={passOriginalNode ? getInputComponent(data, inputProps) : undefined}
      originalNodeKey={
        passOriginalNode ? (
          // `originalNodeKey` is contracted to be what would have been rendered
          // if it wasn't intercepted, so suppress any matching `customKey` here
          // and let the default renderer run.
          <KeyDisplay {...keyDisplayProps} customNodeData={undefined} />
        ) : undefined
      }
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
        // If parentData is null, then we have a Value node at the root level,
        // so don't indent it.
        marginLeft: parentData !== null ? `${indent / 2}em` : 0,
        position: 'relative',
      }}
      // A `draggable` ancestor suppresses native mouse text-selection /
      // cursor-positioning inside a nested input (Chromium hijacks `mousedown`
      // to start a drag), so this node drops `draggable` while its own
      // value/key is being edited. The ancestor collections above it are
      // handled by CollectionNode's `childrenEditing`, so the whole chain above
      // the open input goes non-draggable. Per-node `isEditing`/`isEditingKey`
      // mean only this node re-renders here — not the old global editing flag
      // that re-rendered every draggable node (§16).
      draggable={canDrag && !isEditing && !isEditingKey}
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
                        // Clear any leftover type-change snapshot from a
                        // previously-abandoned edit session so a cancel
                        // doesn't unexpectedly revert to a stale value.
                        setPreviousValue(null)
                        startEdit(path, { cancelOp: handleCancel })
                      }
                    : undefined
                }
                handleDelete={canDelete ? handleDelete : undefined}
                allowClipboard={allowClipboard}
                onCopy={onCopy}
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

// Memoized boundary: a value node whose own `data` and render-affecting props
// are unchanged bails out when its parent re-renders. See areNodePropsEqual.
export const ValueNodeWrapper = React.memo(ValueNodeWrapperBase, areNodePropsEqual)

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
