import React, { useEffect, useState } from 'react'
import { ValueNodeWrapper } from './ValueNodeWrapper'
import { EditButtons, InputButtons } from './ButtonPanels'
import { CollectionNodeProps, ERROR_DISPLAY_TIME, ErrorString } from './types'
import { Icon } from './Icons'
import './style.css'
import { AutogrowTextArea } from './AutogrowTextArea'

export const isCollection = (value: unknown) => value !== null && typeof value == 'object'

export const CollectionNode: React.FC<CollectionNodeProps> = ({ data, path, name, ...props }) => {
  const {
    onEdit,
    onAdd,
    onDelete,
    restrictEditFilter,
    restrictDeleteFilter,
    restrictAddFilter,
    keySort,
    showArrayIndices,
    defaultValue,
  } = props
  const [isEditing, setIsEditing] = useState(false)
  const [stringifiedValue, setStringifiedValue] = useState(JSON.stringify(data, null, 2))
  const [error, setError] = useState<string | null>(null)

  const collectionSize = Object.keys(data).length
  const filterProps = { key: name, path, level: path.length, value: data, size: collectionSize }

  const [collapsed, setCollapsed] = useState(props.collapseFilter(filterProps))

  useEffect(() => {
    setStringifiedValue(JSON.stringify(data, null, 2))
  }, [data])

  useEffect(() => {
    setCollapsed(props.collapseFilter(filterProps))
  }, [props.collapseFilter])

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
      setError('Invalid JSON')
      console.log('Invalid JSON')
      return
    }
  }

  const handleAdd = (key: string) => {
    setCollapsed(false)
    if (collectionType === 'array') {
      onAdd(defaultValue, [...path, (data as unknown[]).length]).then((error) => {
        if (error) showError(error)
      })
    } else if (key in data) {
      showError('Key already exists')
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

  const canEdit = !restrictEditFilter(filterProps)
  const canDelete = !restrictDeleteFilter(filterProps)
  const canAdd = !restrictAddFilter(filterProps)

  const showLabel = showArrayIndices || !(typeof path.slice(-1)[0] === 'number')

  const keyValueArray = Object.entries(data).map(([key, value]) => [
    collectionType === 'array' ? Number(key) : key,
    value,
  ])

  if (keySort && collectionType === 'object')
    keyValueArray.sort(typeof keySort === 'function' ? (a, b) => keySort(a[0], b[0]) : undefined)

  // Used to determine the approximate height of the block, for setting the
  // max-height in the collapsible interior
  const numOfLines = JSON.stringify(data, null, 2).split('\n').length

  return (
    <div className="jer-component fb-collection-component">
      <div className="jer-collection-header-row">
        <div
          onClick={() => {
            if (!isEditing) setCollapsed(!collapsed)
          }}
        >
          <Icon name="chevron" rotate={collapsed} />
        </div>
        <div className="jer-collection-name">
          {showLabel ? `${name}:` : null}
          <span className="jer-brackets">{brackets.open}</span>
        </div>
        <div className="jer-collection-item-count">{`${collectionSize} items`}</div>
        {collapsed && <div className="jer-brackets">{brackets.close}</div>}
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
            enableClipboard={props.enableClipboard}
            type={collectionType}
            data={data}
            name={name}
            path={path}
          />
        )}
      </div>
      <div
        className={'jer-collection-inner'}
        style={{
          marginLeft: `${props.indent / 2}em`,
          maxHeight: collapsed ? 0 : `${numOfLines * 1.6}em`,
          overflowY: collapsed ? 'hidden' : 'visible',
          // Need to use max-height for animation to work, unfortunately
          // "height: auto" doesn't 😔
          transition: `max-height ${transitionTime}`,
        }}
      >
        {isEditing ? (
          <div className="jer-collection-text-edit">
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
        ) : (
          <>
            {keyValueArray.map(([key, value]) => (
              <div className="jer-collection-element" key={key}>
                {isCollection(value) ? (
                  <CollectionNode
                    key={key}
                    data={value}
                    path={[...path, key]}
                    name={key}
                    {...props}
                  />
                ) : (
                  <ValueNodeWrapper
                    key={key}
                    data={value}
                    path={[...path, key]}
                    name={key}
                    {...props}
                    showArrayIndices={collectionType === 'object' ? true : showArrayIndices}
                  />
                )}
              </div>
            ))}
          </>
        )}

        <div className={isEditing ? 'jer-collection-error-row' : 'jer-collection-error-row-edit'}>
          {error && <span className="jer-error-slug">{error}</span>}
        </div>
      </div>
      {!collapsed && <div className="jer-brackets">{brackets.close}</div>}
    </div>
  )
}
