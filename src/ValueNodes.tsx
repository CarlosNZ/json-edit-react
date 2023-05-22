import React from 'react'
import { AutogrowTextArea } from './AutogrowTextArea'
import { InputProps } from './types'
import './style.css'

export const truncate = (string: string, length = 200) =>
  string.length < length ? string : `${string.slice(0, length - 2).trim()}...`

export const StringValue: React.FC<InputProps & { value: string }> = ({
  value,
  setValue,
  isEditing,
  path,
  setIsEditing,
  handleEdit,
  handleCancel,
  stringTruncate,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) handleEdit()
    else if (e.key === 'Escape') handleCancel()
  }

  const breakString = (text: string) =>
    text.split('\n').map((line, index, arr) => (
      <span key={index}>
        {line}
        {index < arr.length - 1 ? <br /> : null}
      </span>
    ))

  return isEditing ? (
    <AutogrowTextArea
      className="jer-input-text"
      name={path.join('.')}
      value={value}
      setValue={setValue as React.Dispatch<React.SetStateAction<string>>}
      isEditing={isEditing}
      handleKeyPress={handleKeyPress}
    />
  ) : (
    <span onDoubleClick={() => setIsEditing(true)} className="jer-value-string">
      "{breakString(truncate(value, stringTruncate))}"
    </span>
  )
}

export const NumberValue: React.FC<InputProps & { value: number }> = ({
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

  const validateNumber = (input: string) => {
    return input.replace(/[^0-9.-]/g, '')
  }

  return isEditing ? (
    <input
      className="jer-input-number"
      type="text"
      name={path.join('.')}
      value={value}
      onChange={(e) => setValue(validateNumber(e.target.value))}
      autoFocus
      onFocus={(e) => e.target.select()}
      onKeyDown={handleKeyPress}
      style={{ width: `${String(value).length / 1.5 + 2}em` }}
    />
  ) : (
    <span onDoubleClick={() => setIsEditing(true)} className="jer-value-number">
      {value}
    </span>
  )
}

export const BooleanValue: React.FC<InputProps & { value: boolean }> = ({
  value,
  setValue,
  isEditing,
  path,
  setIsEditing,
}) => {
  return isEditing ? (
    <input
      className="jer-input-boolean"
      type="checkbox"
      name={path.join('.')}
      checked={value}
      onChange={() => setValue(!value)}
    />
  ) : (
    <span onDoubleClick={() => setIsEditing(true)} className="jer-value-boolean">
      {String(value)}
    </span>
  )
}

export const NullValue: React.FC<InputProps> = ({ value, isEditing, setIsEditing }) =>
  isEditing ? (
    <div className="jer-input-null">null</div>
  ) : (
    <div onDoubleClick={() => setIsEditing(true)} className="jer-value-null">
      {String(value)}
    </div>
  )

export const ObjectValue: React.FC<InputProps> = () => {
  return <span className="jer-value-object">{'{ }'}</span>
}

export const ArrayValue: React.FC<InputProps> = ({ value }) => {
  return <span className="jer-value-array">{`[${value === null ? '' : value}]`}</span>
}

export const InvalidValue: React.FC<InputProps> = () => {
  return <span className="jer-value-invalid">Invalid value</span>
}
