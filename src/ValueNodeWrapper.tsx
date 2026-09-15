import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
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
  type CustomNodeDefinition,
  type DataType,
  type DefaultValueFunction,
  type ValueNodeProps,
  type InputProps,
  type CollectionData,
  type ValueData,
  type JsonData,
  type EnumDefinition,
  type TabDirection,
} from './types'
import {
  useTheme,
  useEditingStore,
  useCollapse,
  useNodeVisible,
  type UpdateOutcome,
} from './contexts'
import { buildCustomNodeData, type CustomNodeData } from './CustomNode'
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
    showClipboardButton,
    onCopy,
    canDragOnto,
    canAddHere,
    allowTypeSelection,
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
  // Actions plus a `getSnapshot` for imperative reads, consulted only inside
  // event handlers. The editing state that drives this node's render
  // (`isEditing`) comes from `useCommon`'s per-node selector instead.
  const { open, cancel, submit, getSnapshot } = useEditingStore()
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
    setError,
    derivedValues,
    getNextOrPreviousAtPath,
    buildKeyDisplayProps,
  } = useCommon({ props })

  const { dragSourceProps, getDropTargetProps, BottomDropTarget, DropTargetPadding } = useDragNDrop(
    { canDrag, canDelete, canDragOnto, canAddHere, path, nodeData, onError, translate }
  )

  const [dataType, setDataType] = useState<DataType | string>(getDataType(data, customNodeData))

  // `updateValue` keeps a stable identity — it's handed to a custom node as
  // `setValue`, and `nodeData`'s identity churns every render — so it can't
  // close over `value`/`nodeData`: `onChange` is stabilised upstream, which
  // would freeze the closure. The in-progress value and the node's `NodeData`
  // come from refs-to-latest, and the live document from `getLatestData()`.
  const onChangeValueRef = useRef(value)
  onChangeValueRef.current = value
  const nodeDataRef = useRef(nodeData)
  nodeDataRef.current = nodeData
  const updateValue = useCallback(
    // `JsonData` rather than `ValueData`, so `renderCollectionAsValue` custom
    // components can buffer object values. The `onChange` payload keeps its
    // public primitive typing.
    (newValue: JsonData) => {
      if (!onChange) {
        setValue(newValue as ValueData | CollectionData)
        return
      }
      // `value` is the current (pre-keystroke) value and `fullData` the live
      // document; the rest comes from `nodeData`.
      const modifiedValue = onChange({
        ...nodeDataRef.current,
        value: onChangeValueRef.current as ValueData,
        fullData: getLatestData(),
        newValue: newValue as ValueData,
      })
      setValue(modifiedValue)
    },
    [onChange, getLatestData]
  )

  // Snap the local edit buffer (`value` + `dataType`) back to the committed
  // `data`. The effect below covers `data` changing from any source — external
  // `setData`, undo, a parent re-render — while reject and cancel call this
  // explicitly, since neither changes `data` and a non-committing edit must not
  // leave the input showing a typed-but-discarded value. It's also registered
  // as the store's `cancelOp` for per-node buffer cleanup, and idempotent, so
  // running twice (from `handleCancel` and from the store) is safe.
  const revertToData = () => {
    setValue(typeof data === 'function' ? INVALID_FUNCTION_STRING : data)
    setDataType(getDataType(data, customNodeData))
    // Keep the enum selector in sync with the reverted value: a rejected or
    // cancelled to-enum type change sets `enumType` synchronously before the
    // commit resolves, so reverting only value/dataType would leave the
    // selector stuck on the enum. `setEnumType` and `allowedDataTypes` are
    // declared below, but `revertToData` only ever runs post-render.
    setEnumType(matchEnumType(data, allowedDataTypes))
  }

  useEffect(() => {
    // The user's in-progress edit owns the buffer while a session is open, so
    // resync from `data` only when NOT editing: after a commit, an external
    // `setData`, or a background settlement's revert.
    if (!derivedValues.isEditing) revertToData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

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
  const isVisible = useNodeVisible(path)

  // Holds the latest `handleEdit` for the store's commit-on-displace callback.
  // Declared ABOVE the early-return so the hook runs on every render, and
  // assigned once `handleEdit` exists.
  const handleEditRef = useRef<(inputValue?: unknown, onCommit?: () => void) => void>(NOOP)

  if (!isVisible) return null

  // A local (deferred) type-switch is in progress when the editing `dataType`
  // has moved away from what the committed data reports. `revertToData`
  // resyncs them whenever a session ends, so mid-session divergence can only
  // come from the type selector. `customNodeData` is keyed off committed data
  // and still claims this node mid-switch, but the switched-to type's standard
  // editor must win until the edit commits or cancels.
  const typeSwitchedAway = isEditing && dataType !== getDataType(data, customNodeData)

  // A deferred to-custom switch (`editOnTypeSwitch`) hands the session to the
  // TARGET definition: it shaped the buffer via the `defaultValue` seed, so its
  // component, props and hooks apply until the edit commits or cancels. It's
  // picked by name from the local `dataType`, since the committed-data match in
  // `customNodeData` can't see it. Derived from stable and local state only, so
  // the per-render rebuild is memo-safe.
  const switchedToDefinition = typeSwitchedAway
    ? customNodeDefinitions.find((def) => def.name === dataType && canDeferSwitch(def))
    : undefined
  const effectiveCustomNodeData = switchedToDefinition
    ? buildCustomNodeData(switchedToDefinition)
    : customNodeData

  const {
    CustomComponent,
    componentProps,
    showKey = true,
    showEditTools = true,
    showOnEdit,
    showOnView,
    passOriginalNode,
  } = effectiveCustomNodeData

  const showCustomNode =
    CustomComponent &&
    (switchedToDefinition !== undefined ||
      (!typeSwitchedAway && ((isEditing && showOnEdit) || (!isEditing && showOnView))))

  const handleChangeDataType = (type: DataType) => {
    // A user action clears any pending collapse broadcast, so the remounted
    // node doesn't inherit it. See CollapseProvider's top-of-file doc.
    setCollapseState(null)

    // A definition's `toStandardType` demotes the buffer's custom value to a
    // primitive before ANY conversion: for standard targets it feeds the
    // generic coercion below, and for deferred custom targets the target's
    // `fromStandardType`. Without the demote-then-convert order, a raw custom
    // value reaches the target's hook as e.g. "[object Object]".
    //
    // The applicable hook belongs to whichever definition shaped the current
    // buffer: the committed match when un-switched, the deferred-switch target
    // when switched to a custom type, and none when an earlier in-session
    // switch already converted the buffer to a standard value, where
    // re-applying a hook would mangle it.
    const bufferDefinition =
      typeSwitchedAway && !switchedToDefinition ? undefined : effectiveCustomNodeData
    const source = bufferDefinition?.toStandardType ? bufferDefinition.toStandardType(value) : value

    const customNode = customNodeDefinitions.find((customNode) => customNode.name === type)
    if (customNode) {
      // `defaultValue` may be a value or a function returning one, called
      // per switch, so a definition can produce a fresh default such as
      // `() => new Date()` rather than one fixed at module load.
      const customDefault =
        typeof customNode.defaultValue === 'function'
          ? (customNode.defaultValue as DefaultValueFunction)(nodeData)
          : customNode.defaultValue

      if (canDeferSwitch(customNode)) {
        // Deferred (`editOnTypeSwitch`) behaves like any primitive type
        // change: reseed the buffer and keep the session open. The target's
        // `fromStandardType` derives the seed from the demoted current value.
        // The same hook converts the buffer at confirm, so a throw HERE isn't
        // a reject — an unconvertible value falls back to the `defaultValue`
        // seed, as a switch with no hook does, and Esc still recovers the
        // original.
        let seed: unknown = customDefault
        if (customNode.fromStandardType) {
          try {
            seed = customNode.fromStandardType(source, nodeData, customNode.componentProps)
          } catch {
            // Keep the defaultValue seed
          }
        }
        setValue(seed as ValueData | CollectionData)
        setDataType(type)
        setEnumType(null)
        return
      }
      // A switch to a custom node is structural: commit and remount, closing
      // the editor.
      submit({ op: 'edit', path, value: customDefault }).then(
        settleEdit(customDefault as JsonData)
      )
      setCollapseState({ path, collapsed: false, includeChildren: false })
      return
    }

    const enumDef = allowedDataTypes.find((dt) => dt instanceof Object && dt.enum === type) as
      EnumDefinition | undefined
    if (enumDef) {
      // An enum stays a value node, so this is local only: coerce the buffer
      // to a valid option and keep the editor open until the next real submit.
      if (typeof value !== 'string' || !enumDef.values.includes(value)) setValue(enumDef.values[0])
      setEnumType(enumDef)
      setDataType(type)
      return
    }

    const newValue = convertValue(source, type, translate('DEFAULT_NEW_KEY', nodeData))

    if (type === 'object' || type === 'array' || type === 'null') {
      // Commit immediately and close the editor: a collection is structural
      // and remounts, and `null` has no value to edit.
      submit({ op: 'edit', path, value: newValue }).then(settleEdit(newValue as JsonData))
      // Launch the new collection expanded (#217), or a level-based `collapse`
      // setting hides the just-created contents.
      if (type !== 'null') setCollapseState({ path, collapsed: false, includeChildren: false })
      return
    }

    // Primitive ↔ primitive (string/number/boolean) is local only: adjust the
    // buffer and type with no commit, leaving the editor open for the single
    // commit on the real submit.
    setValue(newValue as ValueData | CollectionData)
    setDataType(type)
    setEnumType(null)
  }

  // Settles a value-edit or type-change commit on the NODE side. A rejected
  // settlement surfaces the error via this node's `onError`, inline and to the
  // observer. A rejected or silently-cancelled (`null`) settlement also reverts
  // the local buffer, since neither changes `data` and the `[data]` effect
  // therefore won't. Skipped once the user has reopened THIS node, so a stale
  // settlement can't clobber the new in-progress edit; a superseded commit
  // resolves to `undefined` and falls through untouched.
  const settleEdit = (attempted: JsonData) => (outcome: UpdateOutcome | undefined) => {
    if (outcome?.status === 'error') onError(outcome.error, attempted)
    if (outcome?.status === 'error' || outcome?.status === 'cancel') {
      const active = getSnapshot().active
      const reopened = active?.phase === 'editing' && pathsEqual(active.path, path)
      if (!reopened) revertToData()
    }
  }

  // Commits the in-progress value edit through the store's commit engine,
  // which fires `submitEdit` → `commitEdit` and settles. `onCommit` lets Tab
  // open the next field at the commit moment.
  const handleEdit = (inputValue?: unknown, onCommit?: () => void) => {
    // An explicitly-passed value (e.g. a custom node supplying its own)
    // commits as-is; otherwise the buffer for the current `dataType` does.
    // Only `number` needs coercion, its buffer being a transient string ("-",
    // "1.") mid-edit. `dataType` is never 'object'/'array' here: a type change
    // to a collection commits eagerly in `handleChangeDataType`.
    const explicit = inputValue !== undefined && !isJsEvent(inputValue)
    let newValue: JsonData
    if (explicit) newValue = inputValue as JsonData
    else if (showCustomNode && effectiveCustomNodeData.fromStandardType) {
      // The custom editor shaped the buffer, so its definition's
      // `fromStandardType` produces the committable value. A throw REJECTS the
      // confirm: nothing submits, no `onCommit`, and the session stays open
      // with the error inline, as an invalid-JSON collection edit does.
      try {
        newValue = effectiveCustomNodeData.fromStandardType(
          value,
          nodeData,
          effectiveCustomNodeData.componentProps
        ) as JsonData
      } catch (err) {
        onError(
          { code: 'UPDATE_ERROR', message: err instanceof Error ? err.message : String(err) },
          value as ValueData
        )
        return
      }
    } else newValue = dataType === 'number' ? toNumberOrZero(value) : (value as JsonData)
    setError(null)
    // A deferred to-custom switch commits here, launching its possibly
    // collection-valued result expanded, as the instant-commit branch does.
    if (switchedToDefinition) setCollapseState({ path, collapsed: false, includeChildren: false })
    submit({ op: 'edit', path, value: newValue, onCommit }).then(settleEdit(newValue))
  }

  // Point the commit-on-displace ref at the LIVE `handleEdit`, which closes
  // over the current `value`/`dataType` buffer. A closure frozen at `open()`
  // time would commit the stale initial buffer.
  handleEditRef.current = handleEdit

  const handleCancel = () => {
    // Revert the buffer locally, then drive the store cancel, which runs the
    // idempotent `revertToData` again as its `cancelOp`. The local revert
    // covers entry paths that registered no `cancelOp` (Tab arrival, redirect).
    setError(null)
    revertToData()
    cancel()
  }

  const handleDelete = () => {
    // An instant op, with no session: the engine fires `delete` and settles,
    // and a rejected settlement re-adds the node and surfaces the error here.
    submit({ op: 'delete', path, instant: true }).then((outcome) => {
      if (outcome?.status === 'error') onError(outcome.error, value as ValueData)
    })
  }

  // DERIVED VALUES (this makes the JSX logic less messy)
  const { isEditingKey } = derivedValues
  // Shown while editing too: a rejected confirm (a throwing `fromStandardType`)
  // keeps the session open with its error inline, as collection JSON edits do.
  const showErrorString = !!error
  const showTypeSelector = isEditing && allowedDataTypes.length > 1
  const showEditButtons = (dataType !== 'invalid' || CustomComponent) && !error && showEditTools
  const shouldShowKey = showLabel && showKey

  // Open this node's edit session, reverting the buffer if it's cancelled.
  // `setIsEditing` is the `canEdit`-gated callable handed to value inputs and
  // custom components; the latter call it unconditionally, so the gate lives
  // here rather than in the component. The pencil's `startEdit` prop reuses the
  // same opener but gates to `undefined` when `!canEdit`, hiding the icon
  // rather than rendering a dead one. A forced/imperative edit takes a separate
  // path (`editorRef.startEdit` → `open(..., { force: true })`).
  //
  // `commitOp` means displacing this edit by opening another node commits the
  // buffer, like Tab, instead of cancelling. A throwing `fromStandardType`
  // makes `handleEdit` return before `submit`, so `onCommit` never runs and the
  // switch is blocked, leaving the editor open with its error.
  const startEdit = () =>
    open(path, {
      cancelOp: revertToData,
      commitOp: (onCommit) => handleEditRef.current(undefined, onCommit),
    })
  const setIsEditing = canEdit ? startEdit : NOOP

  // Commit this field's edit, then open the next/previous node in the given
  // Tab direction. It orchestrates store actions against this node's
  // `handleEdit`/`path`, so it stays local rather than joining the pure
  // helpers in keyboard utils. `handleEdit`'s `onCommit` defers `open` to the
  // commit moment, so Tab advances only once this field's edit has landed.
  // `getNextOrPreviousAtPath` already skips non-viable targets.
  const tabTo = (dir: TabDirection) => () => {
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
    showIconTooltips,
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

  // The key slot follows the effective definition, so a deferred-switch
  // target's `keyComponent` (or lack of one) renders during the switch.
  const keyDisplayProps = {
    ...buildKeyDisplayProps({ handleCancel, getStyles }),
    customNodeData: effectiveCustomNodeData,
  }

  // The cast drops the props omitted from `CustomComponentProps`: the consumer
  // `onError` observer (a component reports errors by throwing from
  // `fromStandardType`) and the committed `data` (read the value via `value` or
  // `nodeData.value`). Type-only, so both still ride along on the spread.
  const ValueComponent = showCustomNode ? (
    <CustomComponent
      {...(props as Omit<typeof props, 'onError' | 'data'>)}
      value={value}
      componentProps={componentProps}
      setValue={updateValue}
      handleEdit={handleEdit}
      handleCancel={handleCancel}
      onKeyDown={(e: React.KeyboardEvent) =>
        handleKeyboard(e, { stringConfirm: handleEdit, cancel: handleCancel })
      }
      isEditing={isEditing}
      isPending={isPending}
      setIsEditing={setIsEditing}
      getStyles={getStyles}
      originalNode={passOriginalNode ? getInputComponent(data, dataType, inputProps) : undefined}
      originalNodeKey={
        passOriginalNode ? (
          // `originalNodeKey` is contracted to be what renders without the
          // interception, so suppress any matching `keyComponent` here and let
          // the default renderer run.
          <KeyDisplay {...keyDisplayProps} customNodeData={undefined} />
        ) : undefined
      }
      canEdit={canEdit}
      keyboardCommon={inputProps.keyboardCommon}
    />
  ) : (
    // Re-fetch the data type, to be sure it's one of the core ones
    getInputComponent(data, dataType, inputProps)
  )

  return (
    <div
      className="jer-component jer-value-component"
      style={{
        // A null `parentData` means a value node at the root level, which
        // isn't indented.
        marginLeft: parentData !== null ? `${indent / 2}em` : 0,
        position: 'relative',
      }}
      // A `draggable` ancestor suppresses native mouse text-selection and
      // cursor-positioning inside a nested input, since Chromium hijacks
      // `mousedown` to start a drag. So this node drops `draggable` while its
      // own value or key is being edited, and CollectionNode's
      // `childrenEditing` handles the ancestor collections, taking the whole
      // chain above the open input non-draggable. `isEditing`/`isEditingKey`
      // are per-node selectors, so only this node re-renders here.
      draggable={canDrag && !isEditing && !isEditingKey}
      {...dragSourceProps}
      {...getDropTargetProps('above')}
    >
      {BottomDropTarget}
      <DropTargetPadding position="above" nodeData={nodeData} />
      <div
        className="jer-value-main-row"
        style={{
          ...getStyles('valueRow', nodeData),
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
              translate={translate}
              showIconTooltips={showIconTooltips}
              editConfirmRef={editConfirmRef}
            />
          ) : (
            showEditButtons && (
              <EditButtons
                startEdit={canEdit ? startEdit : undefined}
                handleDelete={canDelete ? handleDelete : undefined}
                showClipboardButton={showClipboardButton}
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

// Memoised boundary: a value node whose own `data` and render-affecting props
// are unchanged bails out when its parent re-renders.
export const ValueNodeWrapper = React.memo(ValueNodeWrapperBase, areNodePropsEqual)

// A to-custom type switch can defer — stay local, one commit on confirm — only
// when the target definition opts in AND can render an editor for the seeded
// buffer. Otherwise the switch instant-commits `defaultValue`.
const canDeferSwitch = (def: CustomNodeDefinition) =>
  !!def.editOnTypeSwitch && !!def.component && !!def.showOnEdit

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
  // Pick the input from the edit `dataType`, not the buffer value's runtime
  // type. `dataType` is coerced alongside `value` on a local primitive type
  // change and synced to `data` when not editing, making it the authoritative
  // editing type. The buffer's runtime type is unstable mid-edit — a number's
  // buffer is a string ("-", "1.") between keystrokes — so keying off
  // `getDataType(value)` would flip the editor from `NumberValue` to
  // `StringValue` on the first character, and the freshly-mounted textarea
  // re-selects its content on focus, swallowing that character. The fallbacks
  // cover a custom-typed node hidden in this view, where `dataType` is the
  // custom name and the buffer's primitive type applies, and a function, which
  // has no editable input.
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

// Coerce a buffer to a number, falling back to 0 for non-numeric or partial
// input ("-", "", "1.2.3").
const toNumberOrZero = (value: unknown): number => {
  // Number(symbol) throws rather than returning NaN
  if (typeof value === 'symbol') return 0
  const n = Number(value)
  return isNaN(n) ? 0 : n
}

const convertValue = (value: unknown, type: DataType, defaultNewKey: string) => {
  switch (type) {
    case 'string':
      // null/undefined have no string representation worth editing — an empty
      // buffer beats the literal "null". Anything more exotic is a custom
      // node's job, via `toStandardType`.
      if (value == null) return ''
      return String(value)
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
