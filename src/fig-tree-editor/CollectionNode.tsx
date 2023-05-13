import { useState } from 'react'
import { ValueNodeWrapper } from './ValueNodeWrapper'
import { EditButtons, InputButtons } from './ButtonPanels'
import { CollectionNodeProps } from './types'
import { Icon } from './Icons'
import { isCollection } from '.'
import './style.css'

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

  const collectionType = Array.isArray(data) ? 'array' : 'object'
  const brackets =
    collectionType === 'array' ? { open: '[', close: ']' } : { open: '{', close: '}' }

  const handleEdit = () => {
    try {
      const value = JSON.parse(stringifiedValue)
      setIsEditing(false)
      setError(null)
      onEdit(value, path).then((result: any) => {
        if (result) {
          setError(result)
          setTimeout(() => setError(null), 3000)
          console.log('Error', result)
        }
      })
    } catch {
      setError('Invalid JSON')
      console.log('Invalid JSON')
      return
    }
  }

  const handleAdd = (key: string) => {
    if (collectionType === 'array') {
      onAdd(defaultValue, [...path, (data as any[]).length]).then((result: any) => {
        if (result) {
          setError(result)
          setTimeout(() => setError(null), 3000)
          console.log('Error', result)
        }
      })
    } else
      onAdd(defaultValue, [...path, key]).then((result: any) => {
        if (result) {
          setError(result)
          setTimeout(() => setError(null), 3000)
          console.log('Error', result)
        }
      })
  }

  const handleDelete =
    path.length > 0
      ? () => {
          onDelete(data, path).then((result: any) => {
            if (result) {
              setError(result)
              setTimeout(() => setError(null), 3000)
              console.log('Error', result)
            }
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

  const keyValueArray = Object.entries(data).map(([key, value]) => [
    collectionType === 'array' ? Number(key) : key,
    value,
  ])

  if (keySort && collectionType === 'object')
    keyValueArray.sort(typeof keySort === 'function' ? (a, b) => keySort(a[0], b[0]) : undefined)

  return (
    <div className="fg-component fb-collection-component">
      <div className="fg-collection-header-row">
        <div
          onClick={() => {
            if (!isEditing) setCollapsed(!collapsed)
          }}
        >
          <Icon name="chevron" rotate={collapsed} />
        </div>
        <div className="fg-collection-name">
          {name}: <span className="fg-brackets">{brackets.open}</span>
        </div>
        <div className="fg-collection-item-count">{`${collectionSize} items`}</div>
        {collapsed && <div className="fg-brackets">{brackets.close}</div>}
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

      {!collapsed && (
        <>
          <div className="fg-collection-inner" style={{ marginLeft: `${props.indent}em` }}>
            {isEditing ? (
              <div className="fg-collection-text-edit">
                <textarea
                  rows={stringifiedValue.split('\n').length + 1}
                  className="fg-collection-text-area"
                  name={path.join('.')}
                  value={stringifiedValue}
                  onChange={(e) => setStringifiedValue(e.target.value)}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                />
                <div className="fg-collection-input-button-row">
                  <InputButtons onOk={handleEdit} onCancel={handleCancel} isCollection />
                </div>
              </div>
            ) : (
              <>
                {keyValueArray
                  // TO-DO: Sort keys if "keySort" prop specified
                  .map(([key, value]) => (
                    <div className="fg-collection-element" key={key}>
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

            <div className="fg-collection-error-row">
              {error && <span className="fg-error-slug">{error}</span>}
            </div>
          </div>
          <div className="fg-brackets">{brackets.close}</div>
        </>
      )}
    </div>
  )
}
