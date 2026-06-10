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
  valueDataTypes,
  type DataType,
  type ValueNodeProps,
  type InputProps,
  type CollectionData,
  type ValueData,
  type JsonData,
  type EnumDefinition,
  type TabDirection,
} from './types'
import { useTheme, useEditingStore, useCollapse, type UpdateOutcome } from './contexts'
import { type CustomNodeData } from './CustomNode'
import { filterNode } from './utils/filter'
import { pathsEqual } from './utils/pathTools'
import { isJsEvent, matchEnumType, NOOP } from './utils/misc'
import { useCommon, useDragNDrop } from './hooks'
import { KeyDisplay } from './KeyDisplay'
import { areNodePropsEqual } from './utils/memoNode'

const ValueNodeWrapperBase: React.FC<ValueNodeProps> = (props) => {
  const {
    data,
    parentData,
    onChange,
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
    Select,
    handleKeyboard,
    keyboardControls,
    editConfirmRef,
    jsonStringify,
    showIconTooltips,
    getLatestData,
  } = props
  const { getStyles } = useTheme()
  // Actions + a getSnapshot for imperative reads. The editing *state* this node
  // needs (active, tabDirection, previouslyEditedElement) is only read
  // inside event handlers / the Tab-redirect effect — never during render — so
  // it's read from the snapshot at use-time rather than subscribed to. The only
  // editing state that drives this node's render (`isEditing`) comes from
  // `useCommon`'s per-node selector.
  const { open, cancel, submit, recordPreviousEdit, setTabDirection, getSnapshot } =
    useEditingStore()
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
    getNextOrPreviousAtPath,
    buildKeyDisplayProps,
  } = useCommon({ props })

  const { dragSourceProps, getDropTargetProps, BottomDropTarget, DropTargetPadding } = useDragNDrop(
    { canDrag, canDragOnto, path, nodeData, onError, translate }
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
  // the input showing the typed-but-discarded value. Also registered as the
  // store's `cancelOp` (per-node buffer cleanup when a session ends without
  // committing — Esc/✗, node switch, external cancel); idempotent, so it's safe
  // to run twice (once from `handleCancel`, once from the store).
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
    // Buffer ⊥ data while a session is open (the user's in-progress edit owns
    // it): resync from `data` only when NOT editing — after a commit, an
    // external `setData`, or a background settlement's revert.
    if (!derivedValues.isEditing) revertToData()
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

  const allowedDataTypes = useMemo(() => {
    // Include custom node options in dataType list
    const allDataTypes = [
      ...standardDataTypes,
      ...customNodeDefinitions
        .filter(({ showInTypeSelector = false, name }) => showInTypeSelector && !!name)
        .map(({ name }) => name as string),
    ]

    if (typeof allowTypeSelection === 'boolean') return allowTypeSelection ? allDataTypes : []

    if (Array.isArray(allowTypeSelection)) return allowTypeSelection

    const result = allowTypeSelection(nodeData)

    if (typeof result === 'boolean') return result ? allDataTypes : []

    return result
  }, [nodeData, allowTypeSelection, customNodeDefinitions])

  const [enumType, setEnumType] = useState<EnumDefinition | null>(
    matchEnumType(value, allowedDataTypes)
  )

  const { isEditing, isPending } = derivedValues

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
    // search-filtered-out node (`!isVisible`) still redirects — it can't
    // render.
    if (isVisible && getSnapshot().active?.force) return
    const { tabDirection, previouslyEditedElement } = getSnapshot()
    const next = getNextOrPreviousAtPath(tabDirection)
    if (next) open(next)
    else if (previouslyEditedElement) open(previouslyEditedElement)
    else cancel()
    // The three booleans gate the redirect; `open`/`cancel` are included for
    // hygiene (store-stable, so they almost never flip). The remaining reads
    // (`tabDirection`, `previouslyEditedElement`, `path`, `sort`) are
    // intentionally excluded — they change every render / edit transition and
    // would cause spurious re-fires when no redirect is needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, isVisible, canEdit, open, cancel])

  if (!isVisible) return null

  const handleChangeDataType = (type: DataType) => {
    // Contract #3: user-action clears broadcast. See CollapseProvider
    // top-of-file doc.
    setCollapseState(null)

    const customNode = customNodeDefinitions.find((customNode) => customNode.name === type)
    if (customNode) {
      // To a custom node: a structural change — commit + remount (editor
      // closes).
      submit({ op: 'edit', path, value: customNode.defaultValue }).then(
        settleEdit(customNode.defaultValue as JsonData)
      )
      setCollapseState({ path, collapsed: false, includeChildren: false })
      return
    }

    const enumDef = allowedDataTypes.find((dt) => dt instanceof Object && dt.enum === type) as
      | EnumDefinition
      | undefined
    if (enumDef) {
      // Enum stays a value node — local only: coerce the buffer to a valid
      // option and keep the editor open. Committed on the next real submit.
      if (typeof value !== 'string' || !enumDef.values.includes(value)) setValue(enumDef.values[0])
      setEnumType(enumDef)
      setDataType(type)
      return
    }

    const newValue = convertValue(
      value,
      type,
      translate('DEFAULT_NEW_KEY', nodeData),
      // If coming *FROM* a custom type, change value to something that no
      // longer matches the custom node condition.
      customNodeData?.CustomComponent ? translate('DEFAULT_STRING', nodeData) : undefined
    )

    if (type === 'object' || type === 'array' || type === 'null') {
      // Commit immediately and close the editor: a collection is structural (it
      // remounts), and `null` has no value to edit — so there's nothing to keep
      // the editor open for.
      submit({ op: 'edit', path, value: newValue }).then(settleEdit(newValue as JsonData))
      return
    }

    // Primitive ↔ primitive (string/number/boolean): local only — adjust the
    // buffer + type, no commit; the editor stays open and the single commit
    // happens on the real submit.
    setValue(newValue as ValueData | CollectionData)
    setDataType(type)
    setEnumType(null)
  }

  // Settles a value-edit / type-change commit on the NODE side. A rejected
  // settlement surfaces the error via this node's `onError` (inline +
  // observer); a rejected OR silently-cancelled (`null`) settlement also
  // reverts the local buffer — neither changes `data`, so the `[data]` effect
  // won't do it (§9.1). Skipped when the user has already reopened THIS node:
  // a stale settlement must not clobber the new in-progress edit (a
  // superseded commit resolves to `undefined`, so it falls through
  // untouched).
  const settleEdit = (attempted: JsonData) => (outcome: UpdateOutcome | undefined) => {
    if (outcome?.status === 'error') onError(outcome.error, attempted)
    if (outcome?.status === 'error' || outcome?.status === 'cancel') {
      const active = getSnapshot().active
      const reopened = active?.phase === 'editing' && pathsEqual(active.path, path)
      if (!reopened) revertToData()
    }
  }

  // Commits the in-progress value edit through the store's commit engine (it
  // fires `submitEdit` → `commitEdit` and settles). On a rejected settlement,
  // surface the error via this node's `onError` (inline message + observer).
  // `onCommit` lets Tab open the next field at the commit moment.
  const handleEdit = (inputValue?: unknown, onCommit?: () => void) => {
    // An explicitly-passed value (e.g. a custom node supplying its own) commits
    // as-is; otherwise commit the buffer for the current `dataType`. Only
    // `number` needs coercion — its buffer is a transient string ("-", "1.")
    // mid-edit; every other type, including enum / custom-node names, commits
    // unchanged. (`dataType` is never 'object'/'array' here: a type-change to
    // a collection commits eagerly and closes the editor in
    // `handleChangeDataType`.)
    const newValue: JsonData =
      inputValue !== undefined && !isJsEvent(inputValue)
        ? (inputValue as JsonData)
        : dataType === 'number'
          ? toNumberOrZero(value)
          : (value as JsonData)
    submit({ op: 'edit', path, value: newValue, onCommit }).then(settleEdit(newValue))
  }

  const handleCancel = () => {
    // Revert the buffer locally, then drive the store cancel (which also runs
    // `cancelOp` = `revertToData` — idempotent). The local revert covers entry
    // paths that registered no `cancelOp` (Tab-arrival, redirect).
    revertToData()
    cancel()
  }

  const handleDelete = () => {
    // Instant op (no session). The engine fires `delete` and settles; a
    // rejected settlement reverts (re-adds) and surfaces the error here.
    submit({ op: 'delete', path, instant: true }).then((outcome) => {
      if (outcome?.status === 'error') onError(outcome.error, value as ValueData)
    })
  }

  // DERIVED VALUES (this makes the JSX logic less messy)
  const { isEditingKey } = derivedValues
  const showErrorString = !isEditing && error
  const showTypeSelector = isEditing && allowedDataTypes.length > 1
  const showEditButtons = (dataType !== 'invalid' || CustomComponent) && !error && showEditTools
  const shouldShowKey = showLabel && showKey
  const showCustomNode =
    CustomComponent && ((isEditing && showOnEdit) || (!isEditing && showOnView))

  // Open this node's edit session, reverting the buffer if it's cancelled.
  // `setIsEditing` is the `canEdit`-gated callable handed to value inputs and
  // custom components — the latter call it unconditionally, so the gate has to
  // live here, not in the component. The pencil's `startEdit` prop (below)
  // reuses the same opener but gates to `undefined` when `!canEdit`, to hide
  // the icon rather than render a dead one. A forced/imperative edit takes a
  // separate path (`editorRef.startEdit` → `open(..., { force: true })`).
  const startEdit = () => open(path, { cancelOp: revertToData })
  const setIsEditing = canEdit ? startEdit : NOOP

  // Commit this field's edit, then open the next/previous node in the given Tab
  // direction. Not pure — it orchestrates store actions (`setTabDirection`,
  // `recordPreviousEdit`, `open`) with this node's `handleEdit`/`path`, so it
  // stays local rather than moving to keyboard utils (cf. the pure
  // `getNextOrPrevious`). `handleEdit`'s `onCommit` defers `open` to the commit
  // moment, so Tab advances only once this field's edit has landed.
  const tabTo = (dir: TabDirection) => () => {
    setTabDirection(dir)
    recordPreviousEdit(path)
    const target = getNextOrPreviousAtPath(dir)
    if (target) handleEdit(undefined, () => open(target))
  }

  const inputProps = {
    value,
    parentData,
    setValue: updateValue,
    isEditing,
    canEdit,
    setIsEditing,
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
      tabForward: tabTo('next'),
      tabBack: tabTo('prev'),
    },
    Select,
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
      isPending={isPending}
      setIsEditing={setIsEditing}
      getStyles={getStyles}
      originalNode={passOriginalNode ? getInputComponent(data, dataType, inputProps) : undefined}
      originalNodeKey={
        passOriginalNode ? (
          // `originalNodeKey` is contracted to be what would have been rendered
          // if it wasn't intercepted, so suppress any matching `keyComponent`
          // here and let the default renderer run.
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
    getInputComponent(data, dataType, inputProps)
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
                startEdit={canEdit ? startEdit : undefined}
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
                Select={Select}
              />
            )
          )}
          {showTypeSelector && (
            <Select
              name={`${name}-type-select`}
              value={enumType ? enumType.enum : dataType}
              onChange={(value) => handleChangeDataType(value as DataType)}
              options={allowedDataTypes.map((type) =>
                type instanceof Object && 'enum' in type ? type.enum : type
              )}
            />
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
  if (
    customNodeData?.CustomComponent &&
    customNodeData?.name &&
    customNodeData.showInTypeSelector
  ) {
    return customNodeData.name
  }
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value === null) return 'null'
  return 'invalid'
}

const getInputComponent = (data: JsonData, dataType: DataType | string, inputProps: InputProps) => {
  // Pick the input from the edit `dataType`, not the buffer `value`'s runtime
  // type. `dataType` is coerced alongside `value` on a local primitive
  // type-change and synced to `data` when not editing, so it's the
  // authoritative editing type — whereas the buffer's runtime type is unstable
  // mid-edit: a number's buffer is a string ("-", "1.") between keystrokes, so
  // keying off `getDataType(value)` would flip the editor from `NumberValue` to
  // `StringValue` on the first character (and the freshly-mounted textarea
  // re-selects its content on focus, swallowing that character). Fall back to
  // the buffer's primitive type for a custom-typed node hidden in this view
  // (`dataType` is the custom name — interpret it as its underlying primitive)
  // and to `invalid` for a function (no editable input).
  const rawDataType = (valueDataTypes as readonly string[]).includes(dataType)
    ? dataType
    : typeof data === 'function'
      ? 'invalid'
      : getDataType(inputProps.value)
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

// Coerce a buffer to a number, falling back to 0 for non-numeric / partial
// input ("-", "", "1.2.3"). Shared by `handleEdit`'s commit path and the
// to-number case of `convertValue`.
const toNumberOrZero = (value: unknown): number => {
  const n = Number(value)
  return isNaN(n) ? 0 : n
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
    case 'number':
      return toNumberOrZero(value)
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
