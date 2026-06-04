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
    allowTypeSelection,
    searchFilter,
    searchText,
    showLabel,
    stringTruncateLength,
    showStringQuotes,
    indent,
    translate,
    customNodeDefinitions,
    customNodeData,
    handleKeyboard,
    keyboardControls,
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
  const {
    startEdit,
    cancelEdit,
    closeEdit,
    recordPreviousEdit,
    setTabDirection,
    setPreviousValue,
    getSnapshot,
  } = useEditingStore()
  const { setCollapseState } = useCollapse()
  const [value, setValue] = useState<typeof data | CollectionData>(
    // Bad things happen when you put a function into useState
    typeof data === 'function' ? INVALID_FUNCTION_STRING : data
  )

  const {
    nodeData,
    path,
    name,
    canEdit,
    canDelete,
    canDrag,
    error,
    onError,
    derivedValues,
    handleMutationResult,
    getNextOrPreviousAtPath,
    revertPreviousValue,
    buildKeyDisplayProps,
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
  // Only the in-progress `value` needs a ref-to-latest; `name`/`path` come from
  // `nodeDataRef` in the `onChange` payload below.
  const onChangeValueRef = useRef(value)
  onChangeValueRef.current = value
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
        value: onChangeValueRef.current as ValueData,
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
    // Keep the enum selector in sync with the reverted value — a rejected or
    // cancelled to-enum type change sets `enumType` synchronously before the
    // commit resolves, so reverting only value/dataType would leave the
    // selector stuck on the enum. (`setEnumType`/`allowedDataTypes` are
    // declared below; `revertToData` only ever runs post-render.)
    setEnumType(matchEnumType(data, allowedDataTypes))
  }

  useEffect(() => {
    revertToData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const {
    CustomComponent,
    componentProps,
    showKey = true,
    showEditTools = true,
    showOnEdit,
    showOnView,
    passOriginalNode,
  } = customNodeData

  // Include custom node options in dataType list
  const allDataTypes = [
    ...standardDataTypes,
    ...customNodeDefinitions
      .filter(({ showInTypeSelector = false, name }) => showInTypeSelector && !!name)
      .map(({ name }) => name as string),
  ]

  const allowedDataTypes = useMemo(() => {
    if (typeof allowTypeSelection === 'boolean') return allowTypeSelection ? allDataTypes : []

    if (Array.isArray(allowTypeSelection)) return allowTypeSelection

    const result = allowTypeSelection(nodeData)

    if (typeof result === 'boolean') return result ? allDataTypes : []

    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeData, allowTypeSelection])

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
    // A forced (imperative `editorRef.startEdit`) edit overrides `allowEdit`,
    // so don't bounce off this node just because it's normally uneditable. A
    // search-filtered-out node (`!isVisible`) still redirects — it can't render.
    if (isVisible && getSnapshot().currentlyEditingElement?.force) return
    const { tabDirection, previouslyEditedElement } = getSnapshot()
    const next = getNextOrPreviousAtPath(tabDirection)
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

  // `emitEditEvent` is provided by `useCommon` (lifted to dedup with
  // `CollectionNode`).

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
      onEdit(customNode.defaultValue, path).then((result) =>
        handleMutationResult({
          result,
          errorCode: 'UPDATE_ERROR',
          errorValue: customNode.defaultValue as JsonData,
          cancelEvent: 'cancelEdit',
          confirmEvent: 'confirmEdit',
          onRevert: revertToData,
        })
      )
      setDataType(type)
      setEnumType(null)
      // Custom nodes will be instantiated expanded and NOT editing
      closeEdit()
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
        onEdit(attempted, path).then((result) =>
          handleMutationResult({
            result,
            errorCode: 'UPDATE_ERROR',
            // `attempted` rather than `newValue` — `newValue` is declared
            // further down in this function and is never reached on this
            // branch (we return at `setEnumType` below), so referencing it
            // from this callback would throw a TDZ ReferenceError.
            errorValue: attempted as JsonData,
            cancelEvent: 'cancelEdit',
            confirmEvent: 'confirmEdit',
            onRevert: revertToData,
            // Extra `closeEdit()` only on the string-error branch (matches
            // the pre-refactor inline copy; the `false` branch did not).
            onErrorExtra: closeEdit,
          })
        )
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
      customNodeData?.CustomComponent ? translate('DEFAULT_STRING', nodeData) : undefined
    )
    if (!['string', 'number', 'boolean'].includes(type)) closeEdit()
    onEdit(newValue, path).then((result) =>
      handleMutationResult({
        result,
        errorCode: 'UPDATE_ERROR',
        errorValue: newValue as JsonData,
        cancelEvent: 'cancelEdit',
        confirmEvent: 'confirmEdit',
        onRevert: revertToData,
        onErrorExtra: closeEdit,
        onConfirmExtra: () => setEnumType(null),
      })
    )
  }

  // Commits the in-progress value edit and fires the matching `onEditEvent`
  // (`confirmEdit` on commit; `cancelEdit` on no-op/reject).
  const handleEdit = (inputValue?: unknown) => {
    closeEdit()
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
    onEdit(newValue, path).then((result) =>
      handleMutationResult({
        result,
        errorCode: 'UPDATE_ERROR',
        errorValue: newValue,
        cancelEvent: 'cancelEdit',
        confirmEvent: 'confirmEdit',
        onRevert: revertToData,
      })
    )
  }

  // Per-node UI/data cleanup for any session-ending path that isn't a
  // confirm: explicit cancel (Esc/✗), node switch (another node steals the
  // edit), or external cancel (search reset, `editorRef.cancelEdit`).
  // Registered as the store's `cancelOp` so the store invokes it uniformly;
  // it does NOT call back into the store. Both steps are idempotent so the
  // function is safe to run twice in the user-cancel path (once from
  // `handleCancel` directly, once from the store invoking `cancelOp`).
  const revertSession = () => {
    // `revertPreviousValue` returns true when a type-change snapshot was
    // applied; otherwise we fall back to reverting the local edit buffer.
    if (!revertPreviousValue()) revertToData()
  }

  const handleCancel = () => {
    // Revert locally then drive the store cancel. Driving the store also runs
    // `cancelOp` (= `revertSession`) for the canonical external-cancel path,
    // so this looks redundant — but `revertSession` is idempotent, and we
    // still want the local revert to happen on entry paths that don't
    // register a `cancelOp` (Tab-arrival, redirect from a filtered node),
    // where the store has no op to invoke.
    revertSession()
    cancelEdit()
  }

  const handleDelete = () => {
    // `result === false` is a silent cancel (consumer returned `null`); a string
    // (including an empty one) is a real error. Neither edits this node's value
    // buffer.
    onDelete(value, path).then((result) =>
      handleMutationResult({
        result,
        errorCode: 'DELETE_ERROR',
        errorValue: value as ValueData,
        confirmEvent: 'delete',
      })
    )
  }

  // DERIVED VALUES (this makes the JSX logic less messy)
  const { isEditingKey } = derivedValues
  const showErrorString = !isEditing && error
  const showTypeSelector = isEditing && allowedDataTypes.length > 1
  const showEditButtons = (dataType !== 'invalid' || CustomComponent) && !error && showEditTools
  const shouldShowKey = showLabel && showKey
  const showCustomNode = CustomComponent && ((isEditing && showOnEdit) || (!isEditing && showOnView))

  const inputProps = {
    value,
    parentData,
    setValue: updateValue,
    isEditing,
    canEdit,
    setIsEditing: canEdit ? () => startEdit(path, { cancelOp: revertSession }) : NOOP,
    handleEdit,
    handleCancel,
    path,
    stringTruncateLength,
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
        const next = getNextOrPreviousAtPath('next')
        if (next) {
          handleEdit()
          startEdit(next)
        }
      },
      tabBack: () => {
        setTabDirection('prev')
        recordPreviousEdit(path)
        const prev = getNextOrPreviousAtPath('prev')
        if (prev) {
          handleEdit()
          startEdit(prev)
        }
      },
    },
  }

  const keyDisplayProps = buildKeyDisplayProps({ handleCancel, getStyles })

  const ValueComponent = showCustomNode ? (
    <CustomComponent
      {...props}
      value={value}
      componentProps={componentProps}
      setValue={updateValue}
      handleEdit={handleEdit}
      handleCancel={handleCancel}
      handleKeyPress={(e: React.KeyboardEvent) =>
        handleKeyboard(e, { stringConfirm: handleEdit, cancel: handleCancel })
      }
      isEditing={isEditing}
      setIsEditing={() => startEdit(path, { cancelOp: revertSession })}
      getStyles={getStyles}
      originalNode={passOriginalNode ? getInputComponent(data, inputProps) : undefined}
      originalNodeKey={
        passOriginalNode ? (
          // `originalNodeKey` is contracted to be what would have been rendered
          // if it wasn't intercepted, so suppress any matching `keyComponent` here
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
        {shouldShowKey && <KeyDisplay {...keyDisplayProps} />}
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
                        startEdit(path, { cancelOp: revertSession })
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
  if (customNodeData?.CustomComponent && customNodeData?.name && customNodeData.showInTypeSelector) {
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
