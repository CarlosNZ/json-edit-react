import React from 'react'
import { AutogrowTextArea } from './AutogrowTextArea'
import { InputProps } from './types'
import { useTheme } from './theme'
import './style.css'

export const INVALID_FUNCTION_STRING = '**INVALID_FUNCTION**'

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
  const { styles } = useTheme()
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
    <div
      onDoubleClick={() => setIsEditing(true)}
      onClick={(e) => {
        if (e.getModifierState('Control') || e.getModifierState('Meta')) setIsEditing(true)
      }}
      className="jer-value-string"
      style={styles.string}
    >
      "{breakString(truncate(value, stringTruncate))}"
    </div>
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
  const { styles } = useTheme()
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
    <span
      onDoubleClick={() => setIsEditing(true)}
      className="jer-value-number"
      style={styles.number}
    >
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
  const { styles } = useTheme()
  return isEditing ? (
    <input
      className="jer-input-boolean"
      type="checkbox"
      name={path.join('.')}
      checked={value}
      onChange={() => setValue(!value)}
    />
  ) : (
    <span
      onDoubleClick={() => setIsEditing(true)}
      className="jer-value-boolean"
      style={styles.boolean}
    >
      {String(value)}
    </span>
  )
}

export const NullValue: React.FC<InputProps> = ({ value, isEditing, setIsEditing }) => {
  const { styles } = useTheme()
  return isEditing ? (
    <div className="jer-input-null">null</div>
  ) : (
    <div onDoubleClick={() => setIsEditing(true)} className="jer-value-null" style={styles.null}>
      {String(value)}
    </div>
  )
}

export const ObjectValue: React.FC<InputProps> = () => (
  <span className="jer-value-object">{'{ }'}</span>
)

export const ArrayValue: React.FC<InputProps> = ({ value }) => (
  <span className="jer-value-array">{`[${value === null ? '' : value}]`}</span>
)

export const InvalidValue: React.FC<InputProps> = ({ value }) => {
  let message = 'Error!'
  switch (typeof value) {
    case 'string':
      if (value === INVALID_FUNCTION_STRING) message = 'Function'
      break
    case 'undefined':
      message = 'Undefined'
      break
    case 'symbol':
      message = 'Symbol'
      break
  }
  return <span className="jer-value-invalid">{message}</span>
}
