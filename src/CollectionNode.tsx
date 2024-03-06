import React, { useEffect, useState, useMemo, useRef } from 'react'
import JSON5 from 'json5'
import { ValueNodeWrapper } from './ValueNodeWrapper'
import { EditButtons, InputButtons } from './ButtonPanels'
import { getCustomNode } from './CustomNode'
import {
  type CollectionNodeProps,
  type ErrorString,
  type NodeData,
  ERROR_DISPLAY_TIME,
} from './types'
import { Icon } from './Icons'
import { filterNode, isCollection } from './filterHelpers'
import './style.css'
import { AutogrowTextArea } from './AutogrowTextArea'
import { useTheme } from './theme'
import { useCollapseAll } from './CollapseProvider'

export const CollectionNode: React.FC<CollectionNodeProps> = ({
  data,
  nodeData: incomingNodeData,
  parentData,
  showCollectionCount,
  ...props
}) => {
  const { getStyles } = useTheme()
  const { collapseState, setCollapseState, doesPathMatch } = useCollapseAll()
  const {
    onEdit,
    onAdd,
    onDelete,
    restrictEditFilter,
    restrictDeleteFilter,
    restrictAddFilter,
    collapseFilter,
    enableClipboard,
    searchFilter,
    searchText,
    indent,
    keySort,
    showArrayIndices,
    defaultValue,
    translate,
    customNodeDefinitions,
  } = props
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingKey, setIsEditingKey] = useState(false)
  const [stringifiedValue, setStringifiedValue] = useState(JSON.stringify(data, null, 2))
  const [error, setError] = useState<string | null>(null)

  const startCollapsed = collapseFilter(incomingNodeData)
  const [collapsed, setCollapsed] = useState(startCollapsed)

  const nodeData = { ...incomingNodeData, collapsed }
  const { path, key: name, size } = nodeData

  // This allows us to not render the children on load if they're hidden (which
  // gives a big performance improvement with large data sets), but still keep
  // the animation transition when opening and closing the accordion
  const hasBeenOpened = useRef(!startCollapsed)
  // Allows us to delay the overflow visibility of the collapsed element until
  // the animation has completed
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setStringifiedValue(JSON.stringify(data, null, 2))
  }, [data])

  useEffect(() => {
    const isCollapsed = collapseFilter(nodeData)
    hasBeenOpened.current = !isCollapsed
    setCollapsed(isCollapsed)
  }, [collapseFilter])

  useEffect(() => {
    if (collapseState !== null && doesPathMatch(path)) {
      hasBeenOpened.current = true
      setCollapsed(collapseState.open)
    }
  }, [collapseState])

  const collectionType = Array.isArray(data) ? 'array' : 'object'
  const brackets =
    collectionType === 'array' ? { open: '[', close: ']' } : { open: '{', close: '}' }

  const transitionTime = getComputedStyle(document.documentElement).getPropertyValue(
    '--jer-expand-transition-time'
  )

  const getDefaultNewValue = useMemo(
    () => (nodeData: NodeData) => {
      if (typeof defaultValue !== 'function') return defaultValue
      return defaultValue(nodeData)
    },
    [defaultValue]
  )

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.shiftKey || e.ctrlKey)) handleEdit()
    else if (e.key === 'Escape') handleCancel()
  }

  const handleCollapse = (e: React.MouseEvent) => {
    if (e.getModifierState('Alt')) {
      hasBeenOpened.current = true
      setCollapseState({ open: !collapsed, path })
      return
    }
    if (!isEditing) {
      setIsAnimating(true)
      hasBeenOpened.current = true
      setCollapsed(!collapsed)
      setTimeout(() => setIsAnimating(false), 500)
    }
  }

  const showError = (errorString: ErrorString) => {
    setError(errorString)
    setTimeout(() => setError(null), ERROR_DISPLAY_TIME)
    console.log('Error', errorString)
  }

  const handleEdit = () => {
    try {
      const value = JSON5.parse(stringifiedValue)
      setIsEditing(false)
      setError(null)
      onEdit(value, path).then((error) => {
        if (error) showError(error)
      })
    } catch {
      setError(translate('ERROR_INVALID_JSON', nodeData))
      setTimeout(() => setError(null), ERROR_DISPLAY_TIME)
      console.log('Invalid JSON')
    }
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

  const handleKeyPressKeyEdit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditKey((e.target as HTMLInputElement).value)
    else if (e.key === 'Escape') handleCancel()
  }

  const handleAdd = (key: string) => {
    setCollapsed(false)
    const newValue = getDefaultNewValue(nodeData)
    if (collectionType === 'array') {
      onAdd(newValue, [...path, (data as unknown[]).length]).then((error) => {
        if (error) showError(error)
      })
    } else if (key in data) {
      showError(translate('ERROR_KEY_EXISTS', nodeData))
    } else {
      onAdd(newValue, [...path, key]).then((error) => {
        if (error) showError(error)
      })
    }
  }

  const handleDelete =
    path.length > 0
      ? () => {
          onDelete(data, path).then((result) => {
            if (result) showError(result)
          })
        }
      : undefined

  const handleCancel = () => {
    setIsEditing(false)
    setIsEditingKey(false)
    setError(null)
    setStringifiedValue(JSON.stringify(data, null, 2))
  }

  const canEdit = useMemo(() => !restrictEditFilter(nodeData), [nodeData])
  const canDelete = useMemo(() => !restrictDeleteFilter(nodeData), [nodeData])
  const canAdd = useMemo(() => !restrictAddFilter(nodeData), [nodeData])
  const canEditKey = parentData !== null && canEdit && canAdd && canDelete

  if (!filterNode('collection', nodeData, searchFilter, searchText) && nodeData.level > 0) {
    return null
  }

  const isArray = typeof path.slice(-1)[0] === 'number'
  const showLabel = showArrayIndices || !isArray
  const showCount = showCollectionCount === 'when-closed' ? collapsed : showCollectionCount

  const keyValueArray = Object.entries(data).map(([key, value]) => [
    collectionType === 'array' ? Number(key) : key,
    value,
  ])

  if (keySort && collectionType === 'object') {
    keyValueArray.sort(
      typeof keySort === 'function' ? (a: string[], b) => keySort(a[0], b[0] as string) : undefined
    )
  }

  // A crude measure to estimate the approximate height of the block, for
  // setting the max-height in the collapsible interior
  const numOfLines = JSON.stringify(data, null, 2).split('\n').length

  const CollectionChildren = !hasBeenOpened.current ? null : !isEditing ? (
    keyValueArray.map(([key, value], index) => (
      <div
        className="jer-collection-element"
        key={key}
        style={getStyles('collectionElement', nodeData)}
      >
        {isCollection(value) ? (
          <CollectionNode
            key={key}
            data={value}
            parentData={data}
            nodeData={{
              key,
              value,
              path: [...path, key],
              level: path.length + 1,
              index,
              parentData: data,
              size: Object.keys(value as object).length,
              fullData: nodeData.fullData,
            }}
            showCollectionCount={showCollectionCount}
            {...props}
          />
        ) : (
          <ValueNodeWrapper
            key={key}
            data={value}
            parentData={data}
            nodeData={{
              key,
              value,
              path: [...path, key],
              level: path.length + 1,
              index,
              size: 1,
              parentData: data,
              fullData: nodeData.fullData,
            }}
            {...props}
            showLabel={collectionType === 'object' ? true : showArrayIndices}
          />
        )}
      </div>
    ))
  ) : (
    <div className="jer-collection-text-edit">
      <div>
        <AutogrowTextArea
          className="jer-collection-text-area"
          name={path.join('.')}
          value={stringifiedValue}
          setValue={setStringifiedValue}
          isEditing={isEditing}
          handleKeyPress={handleKeyPress}
          styles={getStyles('input', nodeData)}
        />
        <div className="jer-collection-input-button-row">
          <InputButtons onOk={handleEdit} onCancel={handleCancel} nodeData={nodeData} />
        </div>
      </div>
    </div>
  )

  const {
    CustomNode,
    customNodeProps,
    hideKey,
    showEditTools = true,
    showOnEdit,
    showOnView,
    showCollectionWrapper = true,
  } = getCustomNode(customNodeDefinitions, nodeData)

  // If the collection wrapper (expand icon, brackets, etc) is hidden, there's
  // no way to open a collapsed custom node, so this ensures it will stay open.
  // It can still be displayed collapsed by handling it internally if this is
  // desired.
  const isCollapsed = !showCollectionWrapper ? false : collapsed

  const CollectionContents =
    CustomNode && ((isEditing && showOnEdit) || (!isEditing && showOnView)) ? (
      <CustomNode
        {...props}
        data={data}
        value={data}
        parentData={parentData}
        nodeData={nodeData}
        customNodeProps={customNodeProps}
        // eslint-disable-next-line
        setValue={(value) => onEdit(value, path)}
        handleEdit={handleEdit}
        handleCancel={handleCancel}
        handleKeyPress={handleKeyPress}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        getStyles={getStyles}
      >
        {CollectionChildren}
      </CustomNode>
    ) : (
      CollectionChildren
    )

  const KeyDisplay = isEditingKey ? (
    <input
      className="jer-collection-name"
      type="text"
      name={path.join('.')}
      defaultValue={name}
      autoFocus
      onFocus={(e) => e.target.select()}
      onKeyDown={handleKeyPressKeyEdit}
      style={{ width: `${String(name).length / 1.5 + 0.5}em` }}
    />
  ) : (
    <span
      style={getStyles('property', nodeData)}
      onDoubleClick={() => canEditKey && setIsEditingKey(true)}
    >
      {showLabel && !hideKey && name !== '' && name !== undefined ? `${name}:` : null}
    </span>
  )

  const EditButtonDisplay = !isEditing && showEditTools && (
    <EditButtons
      startEdit={
        canEdit
          ? () => {
              setIsEditing(true)
              setCollapsed(false)
            }
          : undefined
      }
      handleAdd={canAdd ? handleAdd : undefined}
      handleDelete={canDelete ? handleDelete : undefined}
      enableClipboard={enableClipboard}
      type={collectionType}
      nodeData={nodeData}
      translate={translate}
    />
  )

  return (
    <div
      className="jer-component jer-collection-component"
      style={{
        marginLeft: `${path.length === 0 ? 0 : indent / 2}em`,
        ...getStyles('collection', nodeData),
      }}
    >
      {showCollectionWrapper ? (
        <div className="jer-collection-header-row" style={{ position: 'relative' }}>
          <div className="jer-collection-name">
            <div className="jer-collapse-icon" onClick={(e) => handleCollapse(e)}>
              <Icon name="chevron" rotate={collapsed} nodeData={nodeData} />
            </div>
            {KeyDisplay}
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
              style={getStyles('itemCount', nodeData)}
            >
              {size === 1
                ? translate('ITEM_SINGLE', { ...nodeData, size: 1 }, 1)
                : translate('ITEMS_MULTIPLE', nodeData, size as number)}
            </div>
          )}
          <div
            className={`jer-brackets${isCollapsed ? ' jer-visible' : ' jer-hidden'}`}
            style={getStyles('bracket', nodeData)}
          >
            {brackets.close}
          </div>
          {EditButtonDisplay}
        </div>
      ) : hideKey ? null : (
        <div className="jer-collection-header-row" style={{ position: 'relative' }}>
          {KeyDisplay}
          {EditButtonDisplay}
        </div>
      )}
      <div
        className={'jer-collection-inner'}
        style={{
          maxHeight: isCollapsed ? 0 : !isEditing ? `${numOfLines * 3}em` : undefined,
          overflowY: isCollapsed || isAnimating ? 'hidden' : 'visible',
          // Need to use max-height for animation to work, unfortunately
          // "height: auto" doesn't 😔
          transition: `max-height ${transitionTime}`,
          ...getStyles('collectionInner', nodeData),
        }}
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
          <div className="jer-brackets jer-bracket-outside" style={getStyles('bracket', nodeData)}>
            {brackets.close}
          </div>
        )}
      </div>
    </div>
  )
}
