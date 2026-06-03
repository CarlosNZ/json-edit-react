import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { ValueNodeWrapper } from './ValueNodeWrapper'
import { EditButtons, InputButtons } from './ButtonPanels'
import { getCustomNode } from './CustomNode'
import {
  type CollectionNodeProps,
  type NodeData,
  type CollectionData,
  type ValueData,
  type EditEvent,
} from './types'
import { Icon } from './Icons'
import { filterNode } from './utils/filter'
import { getModifier, getNextOrPrevious, insertCharInTextArea } from './utils/keyboard'
import { isCollection } from './utils/misc'
import { AutogrowTextArea } from './AutogrowTextArea'
import { KeyDisplay } from './KeyDisplay'
import {
  useTheme,
  useEditingStore,
  useEditingSelector,
  useCollapse,
  useAppliedBroadcast,
  useReferenceChanged,
} from './contexts'
import { isDescendantOf } from './utils/pathTools'
import { areNodePropsEqual } from './utils/memoNode'
import { useCollapseTransition, useCommon, useDragNDrop } from './hooks'

const CollectionNodeBase: React.FC<CollectionNodeProps> = (props) => {
  const { getStyles } = useTheme()
  // Actions + imperative reads from the (stable) store — no subscription, so
  // editing transitions elsewhere don't re-render this node.
  const {
    startEdit,
    cancelEdit,
    closeEdit,
    setPreviousValue,
    areChildrenBeingEdited,
    getSnapshot,
  } = useEditingStore()
  const { setCollapseState } = useCollapse()
  const {
    mainContainerRef,
    data,
    nodeData: incomingNodeData,
    parentData,
    showCollectionCount,
    onEdit,
    onAdd,
    onDelete,
    canDragOnto,
    collapseFilter,
    collapseAnimationTime,
    onMove,
    allowClipboard,
    onCopy,
    onEditEvent,
    showIconTooltips,
    searchFilter,
    searchText,
    indent,
    sort,
    showArrayIndices,
    arrayIndexFromOne,
    defaultValue,
    newKeyOptions,
    translate,
    customNodeDefinitions,
    customNodeData,
    jsonParse,
    jsonStringify,
    TextEditor,
    keyboardControls,
    handleKeyboard,
    insertAtTop,
    onCollapse,
    editConfirmRef,
    collapseClickZones,
    getLatestData,
  } = props
  // Holds the raw-JSON edit buffer once the user types into it. Stays `null`
  // until then — while editing, the displayed value is derived lazily by
  // `editBufferValue` (below), rather than eagerly serializing every
  // collection's whole subtree on mount. `null` means "not yet typed into".
  const [stringifiedValue, setStringifiedValue] = useState<string | null>(null)

  const startCollapsed = collapseFilter(incomingNodeData)

  const { contentRef, isAnimating, maxHeight, collapsed, animateCollapse, cssTransitionValue } =
    useCollapseTransition(
      data,
      collapseAnimationTime,
      startCollapsed,
      mainContainerRef,
      jsonStringify
    )

  const {
    pathString,
    nodeData,
    path,
    name,
    size,
    canEdit,
    canDelete,
    canAdd,
    canDrag,
    error,
    setError,
    onError,
    handleEditKey,
    emptyStringKey,
    derivedValues,
  } = useCommon({ props, collapsed })

  const { dragSourceProps, getDropTargetProps, BottomDropTarget, DropTargetPadding } = useDragNDrop(
    { canDrag, canDragOnto, path, nodeData, onMove, onError, translate }
  )

  // This allows us to not render the children on load if they're hidden (which
  // gives a big performance improvement with large data sets), but still keep
  // the animation transition when opening and closing the accordion
  const hasBeenOpened = useRef(!startCollapsed)

  // DERIVED VALUES (this makes the JSX conditional logic easier to follow
  // further down)
  const { isEditing, isEditingKey, isArray, canEditKey } = derivedValues

  // No eager `jsonStringify(data)` sync here: the edit buffer is computed on
  // demand when the node enters JSON-edit mode. A non-editing node never needs
  // it, and serializing every collection's subtree on every parent re-render
  // was a major cost on large trees (and risked clobbering in-progress edits).

  // Contract #2: prop-change retires broadcast. See CollapseProvider top-of-file doc.
  const collapseFilterChanged = useReferenceChanged(collapseFilter)
  useEffect(() => {
    const shouldBeCollapsed = collapseFilter(nodeData) && !isEditing
    hasBeenOpened.current = !shouldBeCollapsed
    animateCollapse(shouldBeCollapsed)
    if (collapseFilterChanged) setCollapseState(null)
    // Only re-fire when `collapseFilter` itself changes — `animateCollapse`
    // depends on this node's own collapsed state, so listing it would make
    // the effect fight every user-driven expand/collapse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapseFilter])

  // Contract #1: apply broadcast commands targeting this node. See
  // CollapseProvider top-of-file doc.
  useAppliedBroadcast(path, hasBeenOpened, animateCollapse)

  // For JSON-editing TextArea
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  // Lets the `string | null` edit buffer back a textarea whose `setValue` is
  // typed `Dispatch<SetStateAction<string>>`. Resolves the functional-updater
  // form against the displayed value and always writes a string, so a user
  // edit never sets the buffer back to null. (It starts null until the first
  // change — until then the textarea shows the derived `editBufferValue`.)
  const setEditBuffer = useCallback<React.Dispatch<React.SetStateAction<string>>>(
    (update) =>
      setStringifiedValue((prev) =>
        typeof update === 'function' ? update(prev ?? jsonStringify(data)) : update
      ),
    [data, jsonStringify]
  )

  // Reset the JSON-edit buffer. Used on the exits this node controls — confirm
  // and cancel (below) — and registered as the store `cancelOp`, which fires
  // when the edit moves to another node, on the entries we own (Edit button +
  // custom `setIsEditing`). Keeps a stale buffer from showing on the next entry,
  // without a per-node effect.
  const clearEditBuffer = useCallback(() => setStringifiedValue(null), [])

  // The raw-JSON buffer shown in the editor. Gated on `isEditing` so a
  // non-editing node never serializes its subtree, and memoized so entering
  // edit through ANY path — toolbar button, Tab, `editorRef.startEdit`, a
  // custom node's `setIsEditing` — serializes once on entry rather than on
  // every re-render until the first keystroke. Once the user types,
  // `stringifiedValue` is non-null and the `??` short-circuits (no serialize).
  const editBufferValue = useMemo(() => {
    if (!isEditing) return null
    return stringifiedValue ?? jsonStringify(data)
  }, [isEditing, stringifiedValue, data, jsonStringify])

  const getDefaultNewValue = useCallback(
    (nodeData: NodeData, newKey: string) => {
      if (typeof defaultValue !== 'function') return defaultValue
      const customDefault = defaultValue(nodeData, newKey)
      return customDefault !== undefined ? customDefault : null
    },
    [defaultValue]
  )

  const getNewKeyOptions = useCallback(
    (nodeData: NodeData) => {
      if (!newKeyOptions) return null
      if (typeof newKeyOptions !== 'function') return newKeyOptions
      return newKeyOptions(nodeData)
    },
    [newKeyOptions]
  )

  const {
    CustomNode,
    customNodeProps,
    CustomWrapper,
    wrapperProps = {},
    hideKey,
    showEditTools = true,
    showOnEdit,
    showOnView,
    showCollectionWrapper = true,
  } = customNodeData

  // Subscribe to "is an edit happening anywhere in my subtree" as a boolean —
  // re-renders this node only when an edit enters or leaves its subtree (keeps
  // it expanded while a descendant is edited via Tab).
  const childrenEditing = useEditingSelector(
    (s) =>
      s.currentlyEditingElement !== null && isDescendantOf(s.currentlyEditingElement.path, path)
  )

  // For when children are accessed via Tab
  if (childrenEditing && collapsed) animateCollapse(false)

  // Early return if this node is filtered out
  const isVisible =
    filterNode('collection', nodeData, searchFilter, searchText) || nodeData.level === 0
  if (!isVisible && !childrenEditing) return null

  const collectionType = Array.isArray(data) ? 'array' : 'object'
  const brackets =
    collectionType === 'array' ? { open: '[', close: ']' } : { open: '{', close: '}' }

  const handleKeyPressEdit = (e: React.KeyboardEvent) => {
    // Normal "Tab" key functionality in TextArea
    // Defined here explicitly rather than in handleKeyboard as we *don't* want
    // to override the normal Tab key with the custom "Tab" key value
    if (e.key === 'Tab' && !e.getModifierState('Shift')) {
      e.preventDefault()
      const newValue = insertCharInTextArea(
        textAreaRef as React.MutableRefObject<HTMLTextAreaElement>,
        '\t'
      )
      setStringifiedValue(newValue)
      return
    }
    handleKeyboard(e, {
      objectConfirm: handleEdit,
      cancel: handleCancel,
    })
  }

  // Fire an `onEditEvent` for this collection's edit/add/delete lifecycle.
  // `nodeData` is read live (handlers re-created each render). Add events
  // describe the parent collection (this node).
  const emitEditEvent = (
    event: Extract<
      EditEvent['event'],
      'confirmEdit' | 'cancelEdit' | 'confirmAdd' | 'cancelAdd' | 'delete'
    >
    // Live `fullData`, not the memoizable `nodeData.fullData` (a bailed node
    // keeps it stale — `areNodePropsEqual` ignores its identity). Same rule as
    // `onError`: observer payloads read the document live.
  ) => onEditEvent?.({ ...nodeData, fullData: getLatestData(), event } as EditEvent)

  const handleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation()
    const modifier = getModifier(e)
    if (modifier && keyboardControls.collapseModifier.includes(modifier)) {
      hasBeenOpened.current = true
      setCollapseState({ collapsed: !collapsed, path, includeChildren: true })
      return
    }
    if (!areChildrenBeingEdited(path)) {
      hasBeenOpened.current = true
      // Flat NodeData (§17): explicit `collapsed` (post-toggle) must come after
      // `...nodeData` (whose `collapsed` is the pre-toggle value).
      if (onCollapse)
        onCollapse({
          ...nodeData,
          // Live `fullData` (a bailed node's `nodeData.fullData` is stale).
          fullData: getLatestData(),
          collapsed: !collapsed,
          includeChildren: false,
        })
      animateCollapse(!collapsed)
    }
  }

  // Commits the raw-JSON edit of this collection and fires the matching
  // `onEditEvent` (`confirmEdit`/`cancelEdit`).
  const handleEdit = () => {
    // Parse exactly the text shown: `editBufferValue` is the displayed buffer
    // and reuses the string the memo already serialized, so the parsed input
    // and the INVALID_JSON payload match the textarea, and confirming without
    // typing doesn't serialize `data` again. The `?? jsonStringify(data)` is a
    // type guard — `editBufferValue` is non-null whenever a confirm can fire.
    const textToParse = editBufferValue ?? jsonStringify(data)
    let value: CollectionData
    try {
      value = jsonParse(textToParse) as CollectionData
    } catch {
      // Parse failure leaves the edit session OPEN (user can fix the JSON), so
      // no terminal event — only the error.
      onError(
        { code: 'INVALID_JSON', message: translate('ERROR_INVALID_JSON', nodeData) },
        textToParse
      )
      return
    }
    closeEdit()
    setPreviousValue(null)
    setError(null)
    // No-op confirm: bail without committing. When the buffer was never
    // typed into, `textToParse` already IS `jsonStringify(data)`, so reuse it
    // rather than serializing `data` a second time.
    const currentDataString = stringifiedValue === null ? textToParse : jsonStringify(data)
    clearEditBuffer()
    // No-op confirm (unchanged JSON) reports as a cancel (closed without change).
    if (jsonStringify(value) === currentDataString) {
      emitEditEvent('cancelEdit')
      return
    }
    onEdit(value, path).then((result) => {
      if (result === false) {
        emitEditEvent('cancelEdit')
        return
      }
      if (typeof result === 'string') {
        onError({ code: 'UPDATE_ERROR', message: result }, value as CollectionData)
        emitEditEvent('cancelEdit')
        return
      }
      emitEditEvent('confirmEdit')
    })
  }

  // Commits an add and fires `confirmAdd` (or the error observer).
  const handleAdd = (key: string) => {
    // Contract #3: user-action clears broadcast. See CollapseProvider top-of-file doc.
    setCollapseState(null)
    animateCollapse(false)
    const newValue = getDefaultNewValue(nodeData, key)

    if (collectionType === 'array') {
      // Array adds are instant — no `startAdd` session opens (no key-entry
      // step), so only `confirmAdd` fires, on success. A rejected/errored array
      // add emits no terminal event (there's no session to close).
      const index = insertAtTop.array ? 0 : (data as unknown[]).length
      const options = insertAtTop.array ? { insert: true } : {}
      onAdd(newValue, [...path, index], options).then((result) => {
        if (typeof result === 'string')
          onError({ code: 'ADD_ERROR', message: result }, newValue as CollectionData)
        else if (result === undefined) emitEditEvent('confirmAdd')
      })
      return
    }

    // Object add: a `startAdd` session is open (key entry), closed silently by
    // the confirm. Terminate it with `confirmAdd` (committed) or `cancelAdd`
    // (duplicate key, silent cancel, or rejected/errored) — mirroring the
    // value-edit confirm flow, so a `startAdd` always pairs with a terminal.
    if (key in data) {
      onError({ code: 'KEY_EXISTS', message: translate('ERROR_KEY_EXISTS', nodeData) }, key)
      emitEditEvent('cancelAdd')
      return
    }
    const options = insertAtTop.object ? { insertBefore: 0 } : {}
    onAdd(newValue, [...path, key], options).then((result) => {
      if (result === false) {
        emitEditEvent('cancelAdd')
        return
      }
      if (typeof result === 'string') {
        onError({ code: 'ADD_ERROR', message: result }, newValue as CollectionData)
        emitEditEvent('cancelAdd')
        return
      }
      emitEditEvent('confirmAdd')
    })
  }

  const handleDelete =
    path.length > 0
      ? () => {
          onDelete(data, path).then((result) => {
            if (typeof result === 'string') onError({ code: 'DELETE_ERROR', message: result }, data)
            else if (result === undefined) emitEditEvent('delete')
          })
        }
      : undefined

  const handleCancel = () => {
    cancelEdit()
    setError(null)
    clearEditBuffer()
    const previousValue = getSnapshot().previousValue
    if (previousValue !== null) onEdit(previousValue, path)
    // Clear the snapshot after any revert — otherwise it lingers in editing
    // state and a later cancel (here or on another node) would see a non-null
    // `previousValue` and trigger an unintended revert.
    setPreviousValue(null)
  }

  const showLabel = showArrayIndices || !isArray
  const showCount = showCollectionCount === 'when-closed' ? collapsed : showCollectionCount
  const showEditButtons = !isEditing && showEditTools
  const showKey = showLabel && !hideKey && name !== undefined
  const showCustomNodeContents =
    CustomNode && ((isEditing && showOnEdit) || (!isEditing && showOnView))

  const keyValueArray = Object.entries(data).map(
    ([key, value]) =>
      [collectionType === 'array' ? Number(key) : key, value] as [string | number, ValueData]
  )

  if (collectionType === 'object') sort<[string | number, ValueData]>(keyValueArray, (_) => _)

  const CollectionChildren = !hasBeenOpened.current ? null : !isEditing ? (
    keyValueArray.map(([key, value], index) => {
      const childNodeData = {
        key,
        value,
        path: [...path, key],
        level: path.length + 1,
        index,
        size: isCollection(value) ? Object.keys(value as object).length : null,
        parentData: data,
        fullData: nodeData.fullData,
      }

      const childCustomNodeData = getCustomNode(customNodeDefinitions, childNodeData)

      return (
        <div
          className="jer-collection-element"
          key={key}
          style={getStyles('collectionElement', childNodeData)}
        >
          {isCollection(value) && !childCustomNodeData?.renderCollectionAsValue ? (
            <CollectionNode
              key={key}
              {...props}
              data={value}
              parentData={data}
              nodeData={childNodeData}
              showCollectionCount={showCollectionCount}
              canDragOnto={canEdit}
              customNodeData={childCustomNodeData}
            />
          ) : (
            <ValueNodeWrapper
              key={key}
              {...props}
              data={value}
              parentData={data}
              nodeData={childNodeData}
              canDragOnto={canEdit}
              showLabel={collectionType === 'object' ? true : showArrayIndices}
              customNodeData={childCustomNodeData}
            />
          )}
        </div>
      )
    })
  ) : (
    <div className="jer-collection-text-edit">
      {TextEditor ? (
        <TextEditor
          value={editBufferValue ?? ''}
          onChange={setStringifiedValue}
          onKeyDown={(e) =>
            handleKeyboard(e, {
              objectConfirm: handleEdit,
              cancel: handleCancel,
            })
          }
        />
      ) : (
        <AutogrowTextArea
          textAreaRef={textAreaRef}
          className="jer-collection-text-area"
          name={pathString}
          value={editBufferValue ?? ''}
          setValue={setEditBuffer}
          handleKeyPress={handleKeyPressEdit}
          styles={getStyles('input', nodeData)}
        />
      )}
      <div className="jer-collection-input-button-row">
        <InputButtons
          onOk={handleEdit}
          onCancel={handleCancel}
          nodeData={nodeData}
          editConfirmRef={editConfirmRef}
        />
      </div>
    </div>
  )

  // If the collection wrapper (expand icon, brackets, etc) is hidden, there's
  // no way to open a collapsed custom node, so this ensures it will stay open.
  // It can still be displayed collapsed by handling it internally if this is
  // desired.
  // Also, if the node is editing via "Tab" key, it's parent must be opened,
  // hence `childrenEditing` check
  const isCollapsed = !showCollectionWrapper ? false : collapsed && !childrenEditing
  if (!isCollapsed) hasBeenOpened.current = true

  const customNodeAllProps = {
    ...props,
    data,
    value: data,
    parentData,
    nodeData,
    setValue: async (val: unknown) => await onEdit(val, path),
    handleEdit,
    handleCancel,
    handleKeyPress: handleKeyPressEdit,
    isEditing,
    setIsEditing: () => startEdit(path, { cancelOp: clearEditBuffer }),
    getStyles,
    canDragOnto: canEdit,
    canEdit,
    keyboardCommon: {},
    onError,
  }

  const CollectionContents = showCustomNodeContents ? (
    <CustomNode customNodeProps={customNodeProps} {...customNodeAllProps}>
      {CollectionChildren}
    </CustomNode>
  ) : (
    CollectionChildren
  )

  const EditButtonDisplay = showEditButtons && (
    <EditButtons
      startEdit={
        canEdit
          ? () => {
              hasBeenOpened.current = true
              setPreviousValue(null)
              startEdit(path, { cancelOp: clearEditBuffer })
            }
          : undefined
      }
      handleAdd={canAdd ? handleAdd : undefined}
      handleDelete={canDelete ? handleDelete : undefined}
      allowClipboard={allowClipboard}
      onCopy={onCopy}
      type={collectionType}
      nodeData={nodeData}
      translate={translate}
      customButtons={props.customButtons}
      keyboardControls={keyboardControls}
      handleKeyboard={handleKeyboard}
      getNewKeyOptions={getNewKeyOptions}
      editConfirmRef={editConfirmRef}
      jsonStringify={jsonStringify}
      showIconTooltips={showIconTooltips}
    />
  )

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
    keyValueArray,
    styles: getStyles('property', nodeData),
    getNextOrPrevious: (type: 'next' | 'prev') =>
      getNextOrPrevious(getLatestData(), path, type, sort),
    handleClick: collapseClickZones.includes('property')
      ? handleCollapse
      : // The "property" area is technically part of the "header" div, so this
        // prevents clicks being passed through when "property" is not enabled
        // but "header" is
        (e: React.MouseEvent) => e.stopPropagation(),
    emptyStringKey,
    nodeData,
    customNodeData,
    getStyles,
  }

  const CollectionNodeComponent = (
    <div
      className="jer-component jer-collection-component"
      style={{
        marginLeft: `${path.length === 0 ? 0 : indent / 2}em`,
        ...getStyles('collection', nodeData),
        position: 'relative',
      }}
      // ANY `draggable` ancestor (not just the immediate parent) suppresses
      // native mouse text-selection / cursor-positioning inside a nested input
      // — Chromium hijacks `mousedown` to start a drag. So the whole ancestor
      // chain above an open input must drop `draggable`, not just the editing
      // node itself: `childrenEditing` (already computed for collapse) is true
      // for this node and every ancestor of the editing node, so reading it
      // here adds no extra re-renders. `isEditing`/`isEditingKey` cover this
      // node's own value/key edit. Together they keep every node from the open
      // input up to the root non-draggable, without the old global editing flag
      // that re-rendered every draggable node in the tree (§16).
      draggable={canDrag && !isEditing && !isEditingKey && !childrenEditing}
      {...dragSourceProps}
      {...getDropTargetProps('above')}
    >
      <div
        className="jer-clickzone"
        style={{
          width: `${indent / 2 + 1}em`,
          zIndex: 10 + nodeData.level * 2,
        }}
        onClick={collapseClickZones.includes('left') ? handleCollapse : undefined}
      />
      {!isEditing && BottomDropTarget}
      <DropTargetPadding position="above" nodeData={nodeData} />
      {showCollectionWrapper ? (
        <div
          className="jer-collection-header-row"
          style={{ position: 'relative' }}
          onClick={collapseClickZones.includes('header') ? handleCollapse : undefined}
        >
          <div className="jer-collection-name">
            <div
              className={`jer-collapse-icon jer-accordion-icon${collapsed ? ' jer-rotate-90' : ''}`}
              style={{ zIndex: 11 + nodeData.level * 2, transition: cssTransitionValue }}
              onClick={handleCollapse}
            >
              <Icon name="chevron" rotate={collapsed} nodeData={nodeData} />
            </div>
            {showKey && <KeyDisplay {...keyDisplayProps} />}
            {!isEditing && (
              <span
                className="jer-brackets jer-bracket-open"
                style={getStyles('bracket', nodeData)}
              >
                {brackets.open}
              </span>
            )}
          </div>
          {!isEditing && showCount && (
            <div
              className={`jer-collection-item-count${showCount ? ' jer-visible' : ' jer-hidden'}`}
              style={{ ...getStyles('itemCount', nodeData), transition: cssTransitionValue }}
            >
              {size === 1
                ? translate('ITEM_SINGLE', { ...nodeData, size: 1 }, 1)
                : translate('ITEMS_MULTIPLE', nodeData, size as number)}
            </div>
          )}
          <div
            className={`jer-brackets${isCollapsed ? ' jer-visible' : ' jer-hidden'}`}
            style={{ ...getStyles('bracket', nodeData), transition: cssTransitionValue }}
          >
            {brackets.close}
          </div>
          {EditButtonDisplay}
        </div>
      ) : hideKey ? (
        <></>
      ) : (
        <div className="jer-collection-header-row" style={{ position: 'relative' }}>
          <KeyDisplay {...keyDisplayProps} />
          {EditButtonDisplay}
        </div>
      )}
      <div
        className={'jer-collection-inner'}
        style={{
          overflowY: isCollapsed || isAnimating ? 'clip' : 'visible',
          // Prevent collapse if this node or any children are being edited
          maxHeight: childrenEditing ? undefined : maxHeight,
          ...getStyles('collectionInner', nodeData),
          transition: cssTransitionValue,
        }}
        ref={contentRef}
      >
        {CollectionContents}
        <div className={isEditing ? 'jer-collection-error-row' : 'jer-collection-error-row-edit'}>
          {error && (
            <span className="jer-error-slug" style={getStyles('error', nodeData)}>
              {error}
            </span>
          )}
        </div>
        {!isEditing && showCollectionWrapper && (
          <div
            className="jer-brackets jer-bracket-outside"
            style={{
              ...getStyles('bracket', nodeData),
              marginLeft: `${indent < 3 ? -1 : indent < 6 ? -0.5 : 0}em`,
            }}
          >
            {brackets.close}
          </div>
        )}
      </div>
      <DropTargetPadding position="below" nodeData={nodeData} />
    </div>
  )

  return CustomWrapper ? (
    <CustomWrapper customNodeProps={wrapperProps} {...customNodeAllProps}>
      {CollectionNodeComponent}
    </CustomWrapper>
  ) : (
    CollectionNodeComponent
  )
}

// Memoized boundary: an untouched subtree (same `data` ref via structural
// sharing) bails out instead of re-rendering when a parent re-renders. The
// recursive `<CollectionNode>` usages above resolve to this memoized export.
export const CollectionNode = React.memo(CollectionNodeBase, areNodePropsEqual)
