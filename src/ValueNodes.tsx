import React, { useEffect } from 'react'
import { AutogrowTextArea } from './AutogrowTextArea'
import { type InputProps } from './types'
import { useTheme } from './theme'
import './style.css'

export const INVALID_FUNCTION_STRING = '**INVALID_FUNCTION**'

/**
 * Truncates a string to a specified length, appends `...` if truncated
 */
export const truncate = (string: string, length = 200) =>
  typeof string === 'string'
    ? string.length < length
      ? string
      : `${string.slice(0, length - 2).trim()}...`
    : string

export const toPathString = (path: Array<string | number>) =>
  path
    // An empty string in a part will "disappear", so replace it with a
    // non-printable char
    .map((part) => (part === '' ? String.fromCharCode(0) : part))
    .join('.')

export const StringValue: React.FC<InputProps & { value: string }> = ({
  value,
  setValue,
  isEditing,
  path,
  setIsEditing,
  handleEdit,
  handleCancel,
  stringTruncate,
  showStringQuotes,
  nodeData,
}) => {
  const { getStyles } = useTheme()
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) handleEdit()
    else if (e.key === 'Escape') handleCancel()
  }
  const pathString = toPathString(path)

  const quoteChar = showStringQuotes ? '"' : ''

  return isEditing ? (
    <AutogrowTextArea
      className="jer-input-text"
      name={pathString}
      value={value}
      setValue={setValue as React.Dispatch<React.SetStateAction<string>>}
      isEditing={isEditing}
      handleKeyPress={handleKeyPress}
      styles={getStyles('input', nodeData)}
    />
  ) : (
    <div
      id={`${pathString}_display`}
      onDoubleClick={() => setIsEditing(true)}
      onClick={(e) => {
        if (e.getModifierState('Control') || e.getModifierState('Meta')) setIsEditing(true)
      }}
      className="jer-value-string"
      style={getStyles('string', nodeData)}
    >
      {quoteChar}
      {truncate(value, stringTruncate)}
      {quoteChar}
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
  nodeData,
}) => {
  const { getStyles } = useTheme()
  const handleKeyPress = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        handleEdit()
        break
      case 'Escape':
        handleCancel()
        break
      case 'ArrowUp':
        e.preventDefault()
        setValue(Number(value) + 1)
        break
      case 'ArrowDown':
        e.preventDefault()
        setValue(Number(value) - 1)
    }
  }

  const validateNumber = (input: string) => {
    return input.replace(/[^0-9.-]/g, '')
  }

  return isEditing ? (
    <input
      className="jer-input-number"
      type="text"
      name={toPathString(path)}
      value={value}
      onChange={(e) => setValue(validateNumber(e.target.value))}
      autoFocus
      onFocus={(e) => e.target.select()}
      onKeyDown={handleKeyPress}
      style={{ width: `${String(value).length / 1.5 + 2}em`, ...getStyles('input', nodeData) }}
    />
  ) : (
    <span
      onDoubleClick={() => setIsEditing(true)}
      className="jer-value-number"
      style={getStyles('number', nodeData)}
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
  handleEdit,
  handleCancel,
  nodeData,
}) => {
  const { getStyles } = useTheme()

  useEffect(() => {
    if (isEditing) document.addEventListener('keydown', listenForSubmit)
    return () => document.removeEventListener('keydown', listenForSubmit)
  }, [isEditing, handleEdit])

  const listenForSubmit = (event: any) => {
    if (event.key === 'Enter') {
      handleEdit()
    } else if (event.key === 'Escape') handleCancel()
  }

  return isEditing ? (
    <input
      className="jer-input-boolean"
      type="checkbox"
      name={toPathString(path)}
      checked={value}
      onChange={() => setValue(!value)}
    />
  ) : (
    <span
      onDoubleClick={() => setIsEditing(true)}
      className="jer-value-boolean"
      style={getStyles('boolean', nodeData)}
    >
      {String(value)}
    </span>
  )
}

export const NullValue: React.FC<InputProps> = ({
  value,
  isEditing,
  setIsEditing,
  handleEdit,
  handleCancel,
  nodeData,
}) => {
  const { getStyles } = useTheme()

  useEffect(() => {
    if (isEditing) document.addEventListener('keydown', listenForSubmit)
    return () => document.removeEventListener('keydown', listenForSubmit)
  }, [isEditing])

  const listenForSubmit = (event: any) => {
    if (event.key === 'Enter') {
      handleEdit()
    } else if (event.key === 'Escape') handleCancel()
  }

  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      className="jer-value-null"
      style={getStyles('null', nodeData)}
    >
      {String(value)}
    </div>
  )
}

export const ObjectValue: React.FC<InputProps> = ({
  value,
  translate,
  isEditing,
  handleEdit,
  handleCancel,
  nodeData,
}) => {
  useEffect(() => {
    if (isEditing) document.addEventListener('keydown', listenForSubmit)
    return () => document.removeEventListener('keydown', listenForSubmit)
  }, [])

  const listenForSubmit = (event: any) => {
    if (event.key === 'Enter') {
      handleEdit()
    } else if (event.key === 'Escape') handleCancel()
  }

  return (
    <span className="jer-value-object">{`{${translate('DEFAULT_NEW_KEY', nodeData)}: "${String(
      value
    )}" }`}</span>
  )
}

export const ArrayValue: React.FC<InputProps> = ({
  value,
  isEditing,
  handleEdit,
  handleCancel,
}) => {
  useEffect(() => {
    if (isEditing) document.addEventListener('keydown', listenForSubmit)
    return () => document.removeEventListener('keydown', listenForSubmit)
  }, [])

  const listenForSubmit = (event: any) => {
    if (event.key === 'Enter') {
      handleEdit()
    } else if (event.key === 'Escape') handleCancel()
  }

  return <span className="jer-value-array">{`[${value === null ? '' : String(value)}]`}</span>
}

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
