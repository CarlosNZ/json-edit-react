import React, { useEffect, useState, useMemo, useRef } from 'react'
import { ValueNodeWrapper } from './ValueNodeWrapper'
import { CustomNodeWrapper } from './CustomNodeWrapper'
import { EditButtons, InputButtons } from './ButtonPanels'
import { getCustomNode } from './helpers'
import { CollectionNodeProps, ERROR_DISPLAY_TIME, ErrorString } from './types'
import { Icon } from './Icons'
import './style.css'
import { AutogrowTextArea } from './AutogrowTextArea'
import { useTheme } from './theme'

export const isCollection = (value: unknown) => value !== null && typeof value == 'object'

export const CollectionNode: React.FC<CollectionNodeProps> = ({
  data,
  path,
  name,
  parentData,
  showCollectionCount,
  ...props
}) => {
  const { styles } = useTheme()
  const {
    onEdit,
    onAdd,
    onDelete,
    restrictEditFilter,
    restrictDeleteFilter,
    restrictAddFilter,
    collapseFilter,
    enableClipboard,
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

  const collectionSize = Object.keys(data).length
  const filterProps = { key: name, path, level: path.length, value: data, size: collectionSize }

  const startCollapsed = collapseFilter(filterProps)
  const [collapsed, setCollapsed] = useState(startCollapsed)

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
    setCollapsed(collapseFilter(filterProps))
  }, [collapseFilter])

  const collectionType = Array.isArray(data) ? 'array' : 'object'
  const brackets =
    collectionType === 'array' ? { open: '[', close: ']' } : { open: '{', close: '}' }

  const transitionTime = getComputedStyle(document.documentElement).getPropertyValue(
    '--jer-expand-transition-time'
  )

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.shiftKey || e.ctrlKey)) handleEdit()
    else if (e.key === 'Escape') handleCancel()
  }

  const handleCollapse = () => {
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
      const value = JSON.parse(stringifiedValue)
      setIsEditing(false)
      setError(null)
      onEdit(value, path).then((error) => {
        if (error) showError(error)
      })
    } catch {
      setError(translate('ERROR_INVALID_JSON'))
      setTimeout(() => setError(null), ERROR_DISPLAY_TIME)
      console.log('Invalid JSON')
      return
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
    if (collectionType === 'array') {
      onAdd(defaultValue, [...path, (data as unknown[]).length]).then((error) => {
        if (error) showError(error)
      })
    } else if (key in data) {
      showError(translate('ERROR_KEY_EXISTS'))
      return
    } else
      onAdd(defaultValue, [...path, key]).then((error) => {
        if (error) showError(error)
      })
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
    setError(null)
    setStringifiedValue(JSON.stringify(data, null, 2))
  }

  const canEdit = useMemo(() => !restrictEditFilter(filterProps), [filterProps])
  const canDelete = useMemo(() => !restrictDeleteFilter(filterProps), [filterProps])
  const canAdd = useMemo(() => !restrictAddFilter(filterProps), [filterProps])
  const canEditKey = parentData !== null && canEdit && canAdd && canDelete

  const isArray = typeof path.slice(-1)[0] === 'number'
  const showLabel = showArrayIndices || !isArray
  const showCount = showCollectionCount === 'when-closed' ? collapsed : showCollectionCount

  const keyValueArray = Object.entries(data).map(([key, value]) => [
    collectionType === 'array' ? Number(key) : key,
    value,
  ])

  if (keySort && collectionType === 'object')
    keyValueArray.sort(typeof keySort === 'function' ? (a, b) => keySort(a[0], b[0]) : undefined)

  // A crude measure to estimate the approximate height of the block, for
  // setting the max-height in the collapsible interior
  const numOfLines = JSON.stringify(data, null, 2).split('\n').length

  const { CustomNode, customNodeProps, hideKey } = getCustomNode(customNodeDefinitions, {
    key: name,
    path,
    level: path.length,
    value: data,
    size: Object.keys(data).length,
  })

  return (
    <div
      className="jer-component fb-collection-component"
      style={{ marginLeft: `${path.length === 0 ? 0 : indent / 2}em` }}
    >
      {CustomNode ? (
        <CustomNodeWrapper name={name} hideKey={hideKey}>
          <CustomNode
            data={data}
            path={path}
            name={name}
            parentData={parentData}
            customProps={customNodeProps}
            {...props}
          />
        </CustomNodeWrapper>
      ) : (
        <>
          <div className="jer-collection-header-row">
            <div onClick={handleCollapse}>
              <Icon name="chevron" rotate={collapsed} />
            </div>
            <div className="jer-collection-name">
              {!isEditingKey && (
                <span
                  style={styles.property}
                  onDoubleClick={() => canEditKey && setIsEditingKey(true)}
                >
                  {showLabel && name ? `${name}:` : null}
                </span>
              )}
              {isEditingKey && (
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
              )}
              {!isEditing && (
                <span className="jer-brackets" style={styles.bracket}>
                  {brackets.open}
                </span>
              )}
            </div>
            {!isEditing && showCollectionCount && (
              <div
                className={`jer-collection-item-count${showCount ? ' jer-visible' : ' jer-hidden'}`}
                style={styles.itemCount}
              >
                {collectionSize === 1
                  ? translate('ITEM_SINGLE', 1)
                  : translate('ITEMS_MULTIPLE', collectionSize)}
              </div>
            )}
            <div
              className={`jer-brackets${collapsed ? ' jer-visible' : ' jer-hidden'}`}
              style={styles.bracket}
            >
              {brackets.close}
            </div>
            {!isEditing && (
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
                data={data}
                name={name}
                path={path}
                translate={translate}
              />
            )}
          </div>
          <div
            className={'jer-collection-inner'}
            style={{
              maxHeight: collapsed ? 0 : !isEditing ? `${numOfLines * 3}em` : undefined,
              overflowY: collapsed || isAnimating ? 'hidden' : 'visible',
              // Need to use max-height for animation to work, unfortunately
              // "height: auto" doesn't 😔
              transition: `max-height ${transitionTime}`,
            }}
          >
            {isEditing ? (
              <div className="jer-collection-text-edit">
                <div>
                  <AutogrowTextArea
                    className="jer-collection-text-area"
                    name={path.join('.')}
                    value={stringifiedValue}
                    setValue={setStringifiedValue}
                    isEditing={isEditing}
                    handleKeyPress={handleKeyPress}
                  />
                  <div className="jer-collection-input-button-row">
                    <InputButtons onOk={handleEdit} onCancel={handleCancel} isCollection />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {!hasBeenOpened.current
                  ? null
                  : keyValueArray.map(([key, value]) => (
                      <div className="jer-collection-element" key={key}>
                        {isCollection(value) ? (
                          <CollectionNode
                            key={key}
                            data={value}
                            parentData={data}
                            path={[...path, key]}
                            name={key}
                            showCollectionCount={showCollectionCount}
                            {...props}
                          />
                        ) : (
                          <ValueNodeWrapper
                            key={key}
                            data={value}
                            parentData={data}
                            path={[...path, key]}
                            name={key}
                            {...props}
                            showLabel={collectionType === 'object' ? true : showArrayIndices}
                          />
                        )}
                      </div>
                    ))}
              </>
            )}

            <div
              className={isEditing ? 'jer-collection-error-row' : 'jer-collection-error-row-edit'}
            >
              {error && (
                <span className="jer-error-slug" style={styles.error}>
                  {error}
                </span>
              )}
            </div>
            <div className="jer-brackets" style={styles.bracket}>
              {brackets.close}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
