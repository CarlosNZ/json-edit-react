import React, { useEffect, useState, useRef, useCallback } from 'react'
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
import {
  filterNode,
  getModifier,
  getNextOrPrevious,
  insertCharInTextArea,
  isCollection,
} from './helpers'
import { AutogrowTextArea } from './AutogrowTextArea'
import { KeyDisplay } from './KeyDisplay'
import { useTheme, useTreeState } from './contexts'
import { useCollapseTransition, useCommon, useDragNDrop } from './hooks'

export const CollectionNode: React.FC<CollectionNodeProps> = (props) => {
  const { getStyles } = useTheme()
  const {
    collapseState,
    setCollapseState,
    getMatchingCollapseState,
    currentlyEditingElement,
    setCurrentlyEditingElement,
    areChildrenBeingEdited,
    previousValue,
    setPreviousValue,
  } = useTreeState()
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
    enableClipboard,
    showIconTooltips,
    searchFilter,
    searchText,
    indent,
    sort,
    showArrayIndices,
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
  } = props
  const [stringifiedValue, setStringifiedValue] = useState(jsonStringify(data))

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

  useEffect(() => {
    setStringifiedValue(jsonStringify(data))
    // if (isEditing) setCurrentlyEditingElement(null)
  }, [data, jsonStringify])

  useEffect(() => {
    const shouldBeCollapsed = collapseFilter(nodeData) && !isEditing
    hasBeenOpened.current = !shouldBeCollapsed
    animateCollapse(shouldBeCollapsed)
    // eslint-disable-next-line
  }, [collapseFilter])

  useEffect(() => {
    if (collapseState !== null) {
      const matchingCollapse = getMatchingCollapseState(path)
      if (matchingCollapse) {
        hasBeenOpened.current = true
        animateCollapse(matchingCollapse.collapsed)
      }
    }
    // eslint-disable-next-line
  }, [collapseState])

  // For JSON-editing TextArea
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

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

  const childrenEditing = areChildrenBeingEdited(pathString)

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

  const handleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation()
    const modifier = getModifier(e)
    if (modifier && keyboardControls.collapseModifier.includes(modifier)) {
      hasBeenOpened.current = true
      setCollapseState({ collapsed: !collapsed, path, includeChildren: true })
      return
    }
    if (!(currentlyEditingElement && currentlyEditingElement.includes(pathString))) {
      hasBeenOpened.current = true
      setCollapseState(null)
      if (onCollapse) onCollapse({ path, collapsed: !collapsed, includeChildren: false })
      animateCollapse(!collapsed)
    }
  }

  const handleEdit = () => {
    try {
      const value = jsonParse(stringifiedValue)
      setCurrentlyEditingElement(null)
      setPreviousValue(null)
      setError(null)
      if (jsonStringify(value) === jsonStringify(data)) return
      onEdit(value, path).then((error) => {
        if (error) {
          onError({ code: 'UPDATE_ERROR', message: error }, value as CollectionData)
        }
      })
    } catch {
      onError(
        { code: 'INVALID_JSON', message: translate('ERROR_INVALID_JSON', nodeData) },
        stringifiedValue
      )
    }
  }

  const handleAdd = (key: string) => {
    animateCollapse(false)
    const newValue = getDefaultNewValue(nodeData, key)
    if (collectionType === 'array') {
      const index = insertAtTop.array ? 0 : (data as unknown[]).length
      const options = insertAtTop.array ? { insert: true } : {}
      onAdd(newValue, [...path, index], options).then((error) => {
        if (error) onError({ code: 'ADD_ERROR', message: error }, newValue as CollectionData)
      })
    } else if (key in data) {
      onError({ code: 'KEY_EXISTS', message: translate('ERROR_KEY_EXISTS', nodeData) }, key)
    } else {
      const options = insertAtTop.object ? { insertBefore: 0 } : {}
      onAdd(newValue, [...path, key], options).then((error) => {
        if (error) onError({ code: 'ADD_ERROR', message: error }, newValue as CollectionData)
      })
    }
  }

  const handleDelete =
    path.length > 0
      ? () => {
          onDelete(data, path).then((error) => {
            if (error) {
              onError({ code: 'DELETE_ERROR', message: error }, data)
            }
          })
        }
      : undefined

  const handleCancel = () => {
    setCurrentlyEditingElement(null)
    if (previousValue !== null) {
      onEdit(previousValue, path)
      return
    }
    setError(null)
    setStringifiedValue(jsonStringify(data))
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
          value={stringifiedValue}
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
          value={stringifiedValue}
          setValue={setStringifiedValue}
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
    setIsEditing: () => setCurrentlyEditingElement(path),
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
              setCurrentlyEditingElement(path)
            }
          : undefined
      }
      handleAdd={canAdd ? handleAdd : undefined}
      handleDelete={canDelete ? handleDelete : undefined}
      enableClipboard={enableClipboard}
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
    name: name as string,
    handleKeyboard,
    handleEditKey,
    handleCancel,
    keyValueArray,
    styles: getStyles('property', nodeData),
    getNextOrPrevious: (type: 'next' | 'prev') =>
      getNextOrPrevious(nodeData.fullData, path, type, sort),
    handleClick: collapseClickZones.includes('property')
      ? handleCollapse
      : // The "property" area is technically part of the "header" div, so this
        // prevents clicks being passed through when "property" is not enabled
        // but "header" is
        (e: React.MouseEvent) => e.stopPropagation(),
    emptyStringKey,
  }

  const CollectionNodeComponent = (
    <div
      className="jer-component jer-collection-component"
      style={{
        marginLeft: `${path.length === 0 ? 0 : indent / 2}em`,
        ...getStyles('collection', nodeData),
        position: 'relative',
      }}
      draggable={canDrag}
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
