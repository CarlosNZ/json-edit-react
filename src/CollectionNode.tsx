import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { ValueNodeWrapper } from './ValueNodeWrapper'
import { EditButtons, InputButtons } from './ButtonPanels'
import { getCustomNode } from './CustomNode'
import {
  type CollectionNodeProps,
  type NodeData,
  type CollectionData,
  type ValueData,
} from './types'
import { Icon } from './Icons'
import { getModifier, insertCharInTextArea } from './utils/keyboard'
import { isCollection, NOOP } from './utils/misc'
import { AutogrowTextArea } from './AutogrowTextArea'
import { KeyDisplay } from './KeyDisplay'
import {
  useTheme,
  useEditingStore,
  useEditingSelector,
  useCollapse,
  useAppliedBroadcast,
  useReferenceChanged,
  useNodeVisible,
} from './contexts'
import { isDescendantOf } from './utils/pathTools'
import { areNodePropsEqual } from './utils/memoNode'
import { useCollapseTransition, useCommon, useDragNDrop } from './hooks'

const CollectionNodeBase: React.FC<CollectionNodeProps> = (props) => {
  const { getStyles } = useTheme()
  // Actions and imperative reads from the stable store, with no subscription,
  // so editing transitions elsewhere don't re-render this node.
  const { open, cancel, submit, areChildrenBeingEdited } = useEditingStore()
  const { setCollapseState } = useCollapse()
  const {
    mainContainerRef,
    data,
    nodeData: incomingNodeData,
    parentData,
    showCollectionCount,
    canDragOnto,
    canAddHere,
    collapseFilter,
    collapseAnimationTime,
    showClipboardButton,
    onCopy,
    showIconTooltips,
    indent,
    sort,
    showArrayIndexes,
    defaultValue,
    newKeyOptions,
    translate,
    customNodeDefinitions,
    customNodeData,
    jsonParse,
    jsonStringify,
    TextEditor,
    Select,
    keyboardControls,
    handleKeyboard,
    insertAtTop,
    onCollapse,
    editConfirmRef,
    collapseClickZones,
    getLatestData,
  } = props
  // The raw-JSON edit buffer, `null` until the user types into it. Until then
  // the displayed value is derived lazily by `editBufferValue` below, rather
  // than eagerly serialising every collection's whole subtree on mount.
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
    derivedValues,
    buildKeyDisplayProps,
  } = useCommon({ props, collapsed })

  const { dragSourceProps, getDropTargetProps, BottomDropTarget, DropTargetPadding } = useDragNDrop(
    { canDrag, canDelete, canDragOnto, canAddHere, path, nodeData, onError, translate }
  )

  // Lets hidden children go unrendered on load — a big performance win on
  // large data sets — while keeping the accordion's open/close transition
  const hasBeenOpened = useRef(!startCollapsed)

  // DERIVED VALUES (this makes the JSX conditional logic easier to follow
  // further down)
  const { isEditing, isEditingKey, isPending, isArray } = derivedValues

  // A changed `collapse` prop is fresher consumer intent than a pending
  // collapse broadcast, so it retires one. See CollapseProvider's top-of-file
  // doc.
  const collapseFilterChanged = useReferenceChanged(collapseFilter)
  useEffect(() => {
    const shouldBeCollapsed = collapseFilter(nodeData) && !isEditing
    hasBeenOpened.current = !shouldBeCollapsed
    animateCollapse(shouldBeCollapsed)
    if (collapseFilterChanged) setCollapseState(null)
    // Only re-fire when `collapseFilter` itself changes. `animateCollapse`
    // depends on this node's own collapsed state, so listing it would make the
    // effect fight every user-driven expand/collapse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapseFilter])

  // Apply broadcast commands targeting this node. See CollapseProvider.
  useAppliedBroadcast(path, hasBeenOpened, animateCollapse)

  // For JSON-editing TextArea
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  // Lets the `string | null` edit buffer back a textarea whose `setValue` is
  // typed `Dispatch<SetStateAction<string>>`. It resolves the
  // functional-updater form against the displayed value and always writes a
  // string, so a user edit never sets the buffer back to null.
  const setEditBuffer = useCallback<React.Dispatch<React.SetStateAction<string>>>(
    (update) =>
      setStringifiedValue((prev) =>
        typeof update === 'function' ? update(prev ?? jsonStringify(data)) : update
      ),
    [data, jsonStringify]
  )

  // Reset the JSON-edit buffer, on the exits this node controls (confirm and
  // cancel below) and as the store `cancelOp`, which fires when the edit moves
  // to another node. Keeps a stale buffer from showing on the next entry,
  // without needing a per-node effect.
  const clearEditBuffer = useCallback(() => setStringifiedValue(null), [])

  // The raw-JSON buffer shown in the editor. Gated on `isEditing`, so a
  // non-editing node never serialises its subtree, and memoised so that
  // entering edit through any path — toolbar button, Tab,
  // `editorRef.startEdit`, a custom node's `setIsEditing` — serialises once on
  // entry rather than on every re-render until the first keystroke. Once the
  // user types,
  // `stringifiedValue` is non-null and the `??` short-circuits.
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
    CustomComponent,
    componentProps,
    CustomWrapperComponent,
    wrapperProps = {},
    showKey = true,
    showEditTools = true,
    showOnEdit,
    showOnView,
    showCollectionWrapper = true,
  } = customNodeData

  // "Is an edit happening anywhere in my subtree", as a boolean, so this node
  // re-renders only when an edit enters or leaves its subtree. Keeps it
  // expanded while a descendant is edited via Tab.
  const childrenEditing = useEditingSelector(
    (s) => s.active !== null && isDescendantOf(s.active.path, path)
  )

  // For when children are accessed via Tab
  if (childrenEditing && collapsed) animateCollapse(false)

  // Early return if this node is filtered out. Root (level 0) is always kept:
  // the editor's outer container still renders when nothing matches, so the
  // user sees an empty tree rather than nothing at all.
  const isVisible = useNodeVisible(path) || nodeData.level === 0
  // Holds the latest `handleEdit` for the store's commit-on-displace callback.
  // Declared ABOVE the early-return so the hook runs on every render, and
  // assigned once `handleEdit` exists below.
  const handleEditRef = useRef<(onCommit?: unknown) => void>(NOOP)
  if (!isVisible && !childrenEditing) return null

  // `visibleSize` is a number on tracked collections while a filter is active,
  // `null` on leaves under a filter, and `undefined` otherwise, so `!= null`
  // means "has a real count". Drives the n-of-m display.
  const { visibleSize } = nodeData

  const collectionType = Array.isArray(data) ? 'array' : 'object'
  const brackets =
    collectionType === 'array' ? { open: '[', close: ']' } : { open: '{', close: '}' }

  const onKeyDownEdit = (e: React.KeyboardEvent) => {
    // Normal "Tab" key behaviour in the TextArea. Defined here rather than in
    // `handleKeyboard`, which would override the normal Tab key with the
    // custom "Tab" key value.
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
      // The explicit post-toggle `collapsed` must come after `...nodeData`,
      // whose own `collapsed` is the pre-toggle value.
      if (onCollapse)
        onCollapse({
          ...nodeData,
          // Live `fullData`: a bailed node's `nodeData.fullData` is stale.
          fullData: getLatestData(),
          collapsed: !collapsed,
          includeChildren: false,
        })
      animateCollapse(!collapsed)
    }
  }

  // Commits the raw-JSON edit of this collection through the store's commit
  // engine. A parse failure keeps the session open and fires only the error.
  // `onCommit` lets a commit-on-displace open the next node at the commit
  // moment; a parse failure returns first, so it never runs and the switch is
  // blocked.
  const handleEdit = (onCommit?: unknown) => {
    // Parse exactly the text shown: `editBufferValue` reuses the string the
    // memo already serialised, so the parsed input and the INVALID_JSON payload
    // both match the textarea. The `?? jsonStringify(data)` is a type guard.
    const textToParse = editBufferValue ?? jsonStringify(data)
    let value: CollectionData
    try {
      value = jsonParse(textToParse) as CollectionData
    } catch {
      onError(
        { code: 'INVALID_JSON', message: translate('ERROR_INVALID_JSON', nodeData) },
        textToParse
      )
      return
    }
    setError(null)
    // `onCommit` is a real callback only from commit-on-displace or Tab. The
    // ✓/OK button (`onOk={handleEdit}`) passes a click event, which is ignored.
    const advance = typeof onCommit === 'function' ? (onCommit as () => void) : undefined
    // The buffer clears at the commit moment, so a `hold()` keeps the typed
    // JSON visible until then; `advance` then opens any displace/Tab target.
    submit({
      op: 'edit',
      path,
      value,
      onCommit: () => {
        clearEditBuffer()
        advance?.()
      },
    }).then((outcome) => {
      if (outcome?.status === 'error') onError(outcome.error, value as CollectionData)
    })
  }

  // Point the commit-on-displace ref at the LIVE `handleEdit`: it closes over
  // the current edit buffer, so a frozen closure would commit the stale one.
  handleEditRef.current = handleEdit

  // Commits an add and fires `commitAdd` (or the error observer).
  const handleAdd = (key: string) => {
    // A user action clears any pending collapse broadcast, so the new node
    // doesn't inherit it. See CollapseProvider's top-of-file doc.
    setCollapseState(null)
    animateCollapse(false)
    const newValue = getDefaultNewValue(nodeData, key)

    if (collectionType === 'array') {
      // Array adds are instant, with no key-entry session: the engine fires
      // `commitAdd` and settles, and a rejected add surfaces the error here.
      const index = insertAtTop.array ? 0 : (data as unknown[]).length
      const options = insertAtTop.array ? { insert: true } : {}
      submit({ op: 'add', path, key: index, value: newValue, options, instant: true }).then(
        (outcome) => {
          if (outcome?.status === 'error') onError(outcome.error, newValue as CollectionData)
        }
      )
      return
    }

    // Object add: a key-entry session is open on this collection. A duplicate
    // key cancels it; otherwise the engine fires submitAdd → commitAdd.
    if (key in data) {
      onError({ code: 'KEY_EXISTS', message: translate('ERROR_KEY_EXISTS', nodeData) }, key)
      cancel()
      return
    }
    const options = insertAtTop.object ? { insertBefore: 0 } : {}
    submit({ op: 'add', path, key, value: newValue, options }).then((outcome) => {
      if (outcome?.status === 'error') onError(outcome.error, newValue as CollectionData)
    })
  }

  const handleDelete =
    path.length > 0
      ? () => {
          submit({ op: 'delete', path, instant: true }).then((outcome) => {
            if (outcome?.status === 'error') onError(outcome.error, data)
          })
        }
      : undefined

  const handleCancel = () => {
    cancel()
    setError(null)
    clearEditBuffer()
  }

  const showLabel = showArrayIndexes || !isArray
  // `'when-collapsed-or-filtered'` surfaces the count whenever the filter is
  // subsetting this collection's children, which `visibleSize != null` detects
  // (see its declaration above).
  const showCount =
    showCollectionCount === 'when-collapsed'
      ? collapsed
      : showCollectionCount === 'when-collapsed-or-filtered'
        ? collapsed || visibleSize != null
        : showCollectionCount
  const showEditButtons = !isEditing && showEditTools
  const shouldShowKey = showLabel && showKey && name !== undefined
  const showCustomNodeContents =
    CustomComponent && ((isEditing && showOnEdit) || (!isEditing && showOnView))

  // Deliberately NOT memoised: the early `return null` above means a `useMemo`
  // here would break the Rules of Hooks, and hoisting it above that return
  // would make filtered-out nodes pay for an entries-map and sort they skip.
  // Cheap enough to recompute for the nodes that do render.
  const keyValueArray = Object.entries(data).map(
    ([key, value]) =>
      [collectionType === 'array' ? Number(key) : key, value] as [string | number, ValueData]
  )

  if (collectionType === 'object') sort<[string | number, ValueData]>(keyValueArray, (_) => _)

  // A custom component with `showOnEdit` owns this node's editor, so it
  // receives the live child rows as `children` in edit mode as well as view
  // mode, never the built-in JSON textarea. The textarea renders only for
  // standard collection editing, and its `editBufferValue`/`handleEdit`
  // plumbing goes unused for these nodes.
  const customOwnsEdit = !!CustomComponent && showOnEdit
  const showChildRows = !isEditing || customOwnsEdit

  const CollectionChildren = !hasBeenOpened.current ? null : showChildRows ? (
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
              canDragOnto={canEdit}
              canAddHere={canAdd}
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
              canAddHere={canAdd}
              showLabel={collectionType === 'object' ? true : showArrayIndexes}
              customNodeData={childCustomNodeData}
            />
          )}
        </div>
      )
    })
  ) : (
    // The -custom variant keeps a custom TextEditor full width, rather than
    // fitting content like the default textarea
    <div className={`jer-collection-text-edit${TextEditor ? '-custom' : ''}`}>
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
          onKeyDown={onKeyDownEdit}
          styles={getStyles('input', nodeData)}
        />
      )}
      <div className="jer-collection-input-button-row">
        <InputButtons
          onOk={handleEdit}
          onCancel={handleCancel}
          nodeData={nodeData}
          translate={translate}
          showIconTooltips={showIconTooltips}
          editConfirmRef={editConfirmRef}
        />
      </div>
    </div>
  )

  // With the collection wrapper (expand icon, brackets, etc.) hidden there's no
  // way to open a collapsed custom node, so it stays open here; a custom node
  // wanting a collapsed display can handle that internally. A node reached by
  // Tab also needs its parent open, hence the `childrenEditing` check.
  const isCollapsed = !showCollectionWrapper ? false : collapsed && !childrenEditing
  if (!isCollapsed) hasBeenOpened.current = true

  // Names the chevron's action, so it follows the node's current state. Serves
  // as both the accessible name and the opt-in hover tooltip, as the icon
  // controls pair `aria-label` with a `showIconTooltips`-gated `title`.
  const collapseLabel = translate(collapsed ? 'TOOLTIP_EXPAND' : 'TOOLTIP_COLLAPSE', nodeData)

  // A getter rather than an object, so a plain collection with no custom
  // component or wrapper never allocates these props — only the two custom-node
  // sites below call it. The consumer `onError` rides along in `...props`,
  // which is harmless: it's omitted from `CustomComponentProps` and a
  // function-result spread isn't excess-checked. A custom component reports
  // errors by throwing from `fromStandardType`, not via a prop.
  const getCustomNodeAllProps = () => ({
    ...props,
    data,
    value: data,
    parentData,
    nodeData,
    setValue: (val: unknown) => submit({ op: 'edit', path, value: val }),
    handleEdit,
    handleCancel,
    onKeyDown: onKeyDownEdit,
    isEditing,
    isPending,
    // Gated on `canEdit`: custom components call `setIsEditing`
    // unconditionally (e.g. on double-click), so a read-only node hands them a
    // no-op rather than an opener.
    setIsEditing: canEdit
      ? () =>
          open(path, {
            cancelOp: clearEditBuffer,
            commitOp: (onCommit) => handleEditRef.current(onCommit),
          })
      : NOOP,
    getStyles,
    canDragOnto: canEdit,
    canAddHere: canAdd,
    canEdit,
    keyboardCommon: {},
  })

  const CollectionContents = showCustomNodeContents ? (
    <CustomComponent componentProps={componentProps} {...getCustomNodeAllProps()}>
      {CollectionChildren}
    </CustomComponent>
  ) : (
    CollectionChildren
  )

  const EditButtonDisplay = showEditButtons && (
    <EditButtons
      startEdit={
        canEdit
          ? () => {
              hasBeenOpened.current = true
              open(path, {
                cancelOp: clearEditBuffer,
                commitOp: (onCommit) => handleEditRef.current(onCommit),
              })
            }
          : undefined
      }
      handleAdd={canAdd ? handleAdd : undefined}
      handleDelete={canDelete ? handleDelete : undefined}
      showClipboardButton={showClipboardButton}
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
      Select={Select}
    />
  )

  const keyDisplayProps = buildKeyDisplayProps({
    handleCancel,
    getStyles,
    keyValueArray,
    handleClick: collapseClickZones.includes('property')
      ? handleCollapse
      : // The "property" area is technically part of the "header" div, so this
        // prevents clicks being passed through when "property" is not enabled
        // but "header" is
        (e: React.MouseEvent) => e.stopPropagation(),
  })

  const CollectionNodeComponent = (
    <div
      className="jer-component jer-collection-component"
      style={{
        marginLeft: `${path.length === 0 ? 0 : indent / 2}em`,
        ...getStyles('collection', nodeData),
        position: 'relative',
      }}
      // ANY `draggable` ancestor, not just the immediate parent, suppresses
      // native mouse text-selection and cursor-positioning inside a nested
      // input, since Chromium hijacks `mousedown` to start a drag. So the whole
      // ancestor chain above an open input must drop `draggable`.
      // `childrenEditing`, already computed for collapse, is true for this node
      // and every ancestor of the editing node, so reading it here adds no
      // re-renders; `isEditing`/`isEditingKey` cover this node's own value or
      // key edit.
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
          style={{ ...getStyles('headerRow', nodeData), position: 'relative' }}
          onClick={collapseClickZones.includes('header') ? handleCollapse : undefined}
        >
          <div className="jer-collection-name">
            {/* The chevron is the only affordance that collapses a single
                node, so it carries button semantics for assistive tech:
                `aria-expanded` announces the state and the name flips with it.
                `tabIndex={-1}` keeps it out of the editor's field-to-field Tab
                flow — one stop per node would swamp a large tree. */}
            <div
              className={`jer-collapse-icon jer-accordion-icon${collapsed ? ' jer-rotate-90' : ''}`}
              style={{ zIndex: 11 + nodeData.level * 2, transition: cssTransitionValue }}
              onClick={handleCollapse}
              role="button"
              tabIndex={-1}
              aria-expanded={!collapsed}
              aria-label={collapseLabel}
              title={showIconTooltips ? collapseLabel : ''}
            >
              <Icon name="collection" nodeData={nodeData} />
            </div>
            {shouldShowKey && <KeyDisplay {...keyDisplayProps} />}
            {!isEditing && (
              <span
                className="jer-brackets jer-bracket-open"
                style={getStyles('bracket', nodeData)}
              >
                {brackets.open}
              </span>
            )}
          </div>
          {showCollectionCount !== false && !isEditing && (
            <div
              className={`jer-collection-item-count${showCount ? ' jer-visible' : ' jer-hidden'}`}
              style={{
                ...getStyles('itemCount', nodeData),
                transition: cssTransitionValue,
                // `allow-discrete` lets the `all` transition animate
                // `display` too, so the count fades rather than pops. The
                // `display` toggle lives in `.jer-collection-item-count`.
                transitionBehavior: 'allow-discrete',
              }}
            >
              {visibleSize != null && visibleSize !== (size as number)
                ? translate('ITEMS_FILTERED', nodeData, {
                    visible: visibleSize,
                    total: size as number,
                  })
                : size === 1
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
      ) : !showKey ? (
        <></>
      ) : (
        <div
          className="jer-collection-header-row"
          style={{ ...getStyles('headerRow', nodeData), position: 'relative' }}
        >
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
        <div className={isEditing ? 'jer-collection-error-row-edit' : 'jer-collection-error-row'}>
          {error && (
            <span className="jer-error-slug" style={getStyles('error', nodeData)}>
              {error}
            </span>
          )}
        </div>
        {!isEditing && showCollectionWrapper && (
          <div className="jer-brackets jer-bracket-outside" style={getStyles('bracket', nodeData)}>
            {brackets.close}
          </div>
        )}
      </div>
      <DropTargetPadding position="below" nodeData={nodeData} />
    </div>
  )

  return CustomWrapperComponent ? (
    <CustomWrapperComponent wrapperProps={wrapperProps} {...getCustomNodeAllProps()}>
      {CollectionNodeComponent}
    </CustomWrapperComponent>
  ) : (
    CollectionNodeComponent
  )
}

// Memoised boundary: an untouched subtree — same `data` reference, via
// structural sharing — bails out instead of re-rendering when a parent does.
// The recursive `<CollectionNode>` usages above resolve to this export.
export const CollectionNode = React.memo(CollectionNodeBase, areNodePropsEqual)
