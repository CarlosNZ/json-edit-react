import { useState } from 'react'
import { ValueNodeWrapper } from './ValueNodeWrapper'
import { EditButtons, InputButtons } from './ButtonPanels'
import { ObjectNodeProps } from './types'
import { Icon } from './Icons'
import './style.css'
import { isCollection } from './utilityMethods'

export const CollectionNode: React.FC<ObjectNodeProps> = ({ data, path, name, ...props }) => {
  const { onEdit, onAdd, onDelete } = props
  const [isEditing, setIsEditing] = useState(false)
  const [stringifiedValue, setStringifiedValue] = useState(JSON.stringify(data, null, 2))
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const collectionType = Array.isArray(data) ? 'array' : 'object'
  const brackets =
    collectionType === 'array' ? { open: '[', close: ']' } : { open: '{', close: '}' }

  const handleEdit = () => {
    try {
      const value = JSON.parse(stringifiedValue)
      setIsEditing(false)
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
      onAdd(null, [...path, (data as any[]).length]).then((result: any) => {
        if (result) {
          setError(result)
          setTimeout(() => setError(null), 3000)
          console.log('Error', result)
        }
      })
    } else
      onAdd(null, [...path, key]).then((result: any) => {
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
    setStringifiedValue(JSON.stringify(data, null, 2))
  }

  return (
    <div className="fg-component fb-object-component">
      <div className="fg-collection-header-row">
        <div
          onClick={() => {
            if (!isEditing) setCollapsed(!collapsed)
          }}
        >
          <Icon name="chevron" rotate={collapsed} />
        </div>
        <div className="fg-collection-name">{`${name} ${brackets.open}`}</div>
        <div className="fg-collection-item-count">{`${Object.keys(data).length} items`}</div>
        {collapsed && <div>{brackets.close}</div>}
        {isEditing ? (
          <InputButtons onOk={handleEdit} onCancel={handleCancel} />
        ) : (
          <EditButtons
            startEdit={() => {
              setIsEditing(true)
              setCollapsed(false)
            }}
            handleAdd={handleAdd}
            handleDelete={handleDelete}
            type={collectionType}
          />
        )}
      </div>

      {!collapsed && (
        <div className="fg-collection-inner">
          {isEditing ? (
            <textarea
              rows={10}
              className="fg-collection-text-area"
              name={path.join('.')}
              value={stringifiedValue}
              onChange={(e) => setStringifiedValue(e.target.value)}
              autoFocus
              onFocus={(e) => e.target.select()}
            ></textarea>
          ) : (
            <>
              {Object.entries(data)
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
                      />
                    )}
                  </div>
                ))}
            </>
          )}
          <div>{brackets.close}</div>
          <div className="fg-collection-error-row">
            {error && <span className="fg-error-slug">{error}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
