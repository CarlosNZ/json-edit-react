import { InputProps } from './types'
import './style.css'

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

export const ObjectValue: React.FC<InputProps> = () => {
  return <span className="fg-value-object">{'{ }'}</span>
}

export const ArrayValue: React.FC<InputProps> = () => {
  return <span className="fg-value-array">{'[ ]'}</span>
}

export const InvalidValue: React.FC<InputProps> = () => {
  return <span className="fg-value-invalid">Invalid value</span>
}
