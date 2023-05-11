import { useEffect, useState } from 'react'
import { DataType, ObjectNodeProps, ValueNodeProps, InputProps, SimpleDataTypes } from './types'
import './style.css'
import { Icon } from './Icons'

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

export const ValueNode: React.FC<ValueNodeProps> = ({ data, name, path, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(data)
  const [error, setError] = useState<string | null>(null)
  const [dataType, setDataType] = useState<DataType>(getDataType(data))

  useEffect(() => {
    setValue(data)
  }, [data])

  const handleEdit = () => {
    setIsEditing(false)
    onEdit(value, path).then((result: any) => {
      if (result) {
        setError(result)
        setTimeout(() => setError(null), 3000)
        console.log('Error', result)
      }
    })
  }

  const handleCancel = () => {
    setIsEditing(false)
    setValue(data)
  }

  const handleDelete = () => {
    onDelete(value, path).then((result: any) => {
      if (result) {
        setError(result)
        setTimeout(() => setError(null), 3000)
        console.log('Error', result)
      }
    })
  }

  const inputProps = {
    value,
    setValue,
    isEditing,
    setIsEditing,
    handleEdit,
    handleCancel,
    path,
  }

  return (
    <div className="fg-component fg-value-component">
      <div className="fg-value-main-row">
        <label htmlFor={path.join('.')} className="fg-object-key">
          {name}:{' '}
        </label>
        <div className="fg-input-component">{getInputComponent(dataType, inputProps)}</div>
        {isEditing ? (
          <InputButtons onOk={handleEdit} onCancel={handleCancel} />
        ) : (
          <EditButtons startEdit={() => setIsEditing(true)} handleDelete={handleDelete} />
        )}
        {isEditing && (
          <select
            name={`${name}-type-select`}
            onChange={(e) => setDataType(e.target.value as DataType)}
            value={dataType}
          >
            {SimpleDataTypes.map((type) => (
              <option value={type} key={type}>
                {type}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="fg-value-error-row">
        {error && <span className="fg-error-slug">{error}</span>}
      </div>
    </div>
  )
}

export const StringValue: React.FC<InputProps> = ({
  value,
  setValue,
  isEditing,
  path,
  setIsEditing,
  handleEdit,
  handleCancel,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEdit()
    else if (e.key === 'Escape') handleCancel()
  }

  return isEditing ? (
    <input
      className="fg-input-text"
      type="text"
      name={path.join('.')}
      value={value as string}
      onChange={(e) => setValue(e.target.value)}
      autoFocus
      onFocus={(e) => e.target.select()}
      onKeyDown={handleKeyPress}
    />
  ) : (
    <span onDoubleClick={() => setIsEditing(true)} className="fg-value-string">{`"${value}"`}</span>
  )
}

export const NumberValue: React.FC<InputProps> = ({
  value,
  setValue,
  isEditing,
  path,
  setIsEditing,
  handleEdit,
  handleCancel,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEdit()
    else if (e.key === 'Escape') handleCancel()
  }

  return isEditing ? (
    <input
      className="fg-input-number"
      type="number"
      name={path.join('.')}
      value={value as number}
      onChange={(e) => setValue(e.target.value)}
      autoFocus
      onFocus={(e) => e.target.select()}
      onKeyDown={handleKeyPress}
    />
  ) : (
    <span onDoubleClick={() => setIsEditing(true)} className="fg-value-number">
      {value}
    </span>
  )
}

export const BooleanValue: React.FC<InputProps> = ({
  value,
  setValue,
  isEditing,
  path,
  setIsEditing,
}) => {
  return isEditing ? (
    <input
      className="fg-input-boolean"
      type="checkbox"
      name={path.join('.')}
      checked={value as boolean}
      onChange={() => setValue(!value)}
    />
  ) : (
    <span onDoubleClick={() => setIsEditing(true)} className="fg-value-boolean">
      {String(value)}
    </span>
  )
}

export const NullValue: React.FC<InputProps> = ({ value, setValue, isEditing, setIsEditing }) => {
  setValue(null)
  return isEditing ? null : (
    <span onDoubleClick={() => setIsEditing(true)} className="fg-value-null">
      {String(value)}
    </span>
  )
}

export const OtherComponent: React.FC<{ data: unknown; path: string[] }> = () => {
  return <span>OTHER</span>
}

export const EditButtons: React.FC<{
  startEdit?: () => void
  handleDelete?: () => void
  handleCopy?: () => void
  handleAdd?: (value: string) => void
}> = ({ startEdit, handleDelete, handleAdd, handleCopy }) => {
  const [isAdding, setIsAdding] = useState(false)
  const [newKey, setNewKey] = useState('Enter new key')

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && handleAdd) {
      setIsAdding(false)
      handleAdd(newKey)
    } else if (e.key === 'Escape') setIsAdding(false)
  }

  return (
    <div className="fg-edit-buttons">
      {handleCopy && (
        <span onClick={handleCopy}>
          <Icon name="copy" />
        </span>
      )}
      {startEdit && (
        <span onClick={startEdit}>
          <Icon name="edit" />
        </span>
      )}
      {handleDelete && (
        <span onClick={handleDelete}>
          <Icon name="delete" />
        </span>
      )}
      {handleAdd && (
        <span onClick={() => setIsAdding(true)}>
          <Icon name="add" />
        </span>
      )}
      {isAdding && handleAdd && (
        <>
          <input
            className="fg-input-new-key"
            type="text"
            name="new-object-key"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            autoFocus
            onFocus={(e) => e.target.select()}
            onKeyDown={handleKeyPress}
          />
          <InputButtons
            onOk={() => {
              if (!!newKey) {
                setIsAdding(false)
                handleAdd(newKey)
              }
            }}
            onCancel={() => {
              setIsAdding(false)
            }}
          />
        </>
      )}
    </div>
  )
}

export const InputButtons: React.FC<{ onOk: () => void; onCancel: () => void }> = ({
  onOk,
  onCancel,
}) => (
  <div className="fg-input-buttons">
    <span onClick={onOk}>
      <Icon name="ok" />
    </span>
    <span onClick={onCancel}>
      <Icon name="cancel" />
    </span>
  </div>
)

const getInputComponent = (dataType: DataType, inputProps: InputProps) => {
  switch (dataType) {
    case 'string':
      return <StringValue {...inputProps} />
    case 'number':
      return <NumberValue {...inputProps} />
    case 'boolean':
      return <BooleanValue {...inputProps} />
    case 'null':
      return <NullValue {...inputProps} />
    default:
      return <p>Other types</p>
  }
}

const getDataType = (value: unknown) => {
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value === null) return 'null'
  return 'invalid'
}

const getComponent = (value: unknown, path: string[], props: any, key?: string) => {
  if (value === null) return <ValueNode key={key} data={null} path={path} {...props} />
  if (typeof value === 'string') return <ValueNode key={key} data={value} path={path} {...props} />
  if (typeof value === 'boolean') return <ValueNode key={key} data={value} path={path} {...props} />
  if (typeof value === 'number') return <ValueNode key={key} data={value} path={path} {...props} />
  if (Array.isArray(value)) return <OtherComponent key={key} data={value} path={path} {...props} />
  if (typeof value === 'object') return <ObjectNode key={key} data={value} path={path} {...props} />

  return <OtherComponent data={null} path={path} />
}
