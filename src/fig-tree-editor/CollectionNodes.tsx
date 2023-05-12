import { useState } from 'react'
import { ValueNodeWrapper } from './ValueNodeWrapper'
import { EditButtons, InputButtons } from './ButtonPanels'
import { ObjectNodeProps } from './types'
import { Icon } from './Icons'
import './style.css'

export const ObjectNode: React.FC<ObjectNodeProps> = ({ data, path, name, ...props }) => {
  const { onEdit, onAdd, onDelete } = props
  const [isEditing, setIsEditing] = useState(false)
  const [stringifiedValue, setStringifiedValue] = useState(JSON.stringify(data, null, 2))
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

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
    onAdd('NEW VALUE', [...path, key]).then((result: any) => {
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
      <div className="fg-object-header-row">
        <div
          onClick={() => {
            if (!isEditing) setCollapsed(!collapsed)
          }}
        >
          <Icon name="chevron" rotate={collapsed} />
        </div>
        <div>
          <strong>{`${name} {`}</strong>
        </div>
        <div>Item count</div>
        {collapsed && <div>{'}'}</div>}
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
          />
        )}
      </div>

      {!collapsed && (
        <div className="fg-object-inner">
          {isEditing ? (
            <textarea
              rows={10}
              className="fg-object-text-area"
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
                  <div className="fg-object-element" key={key}>
                    {getComponent(value, [...path, key], { ...props, name: key }, key)}
                  </div>
                ))}
            </>
          )}
          <div>{'}'}</div>
          <div className="fg-value-error-row">
            {error && <span className="fg-error-slug">{error}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export const OtherComponent: React.FC<{ data: unknown; path: string[] }> = () => {
  return <span>OTHER</span>
}

const getComponent = (value: unknown, path: string[], props: any, key?: string) => {
  if (value === null) return <ValueNodeWrapper key={key} data={null} path={path} {...props} />
  if (typeof value === 'string')
    return <ValueNodeWrapper key={key} data={value} path={path} {...props} />
  if (typeof value === 'boolean')
    return <ValueNodeWrapper key={key} data={value} path={path} {...props} />
  if (typeof value === 'number')
    return <ValueNodeWrapper key={key} data={value} path={path} {...props} />
  if (Array.isArray(value)) return <OtherComponent key={key} data={value} path={path} {...props} />
  if (typeof value === 'object') return <ObjectNode key={key} data={value} path={path} {...props} />

  return <OtherComponent data={null} path={path} />
}
