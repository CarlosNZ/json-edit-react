import React, { useEffect } from 'react'
import { AutogrowTextArea } from './AutogrowTextArea'
import { useTheme } from './theme'
import { type TabDirection, type InputProps } from './types'
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

interface KeyboardHandlers {
  handleTab: (dir: TabDirection) => void
  handleEdit: () => void
  handleCancel: () => void
}

const handleCommonKeyEvents = (
  e: React.KeyboardEvent,
  { handleEdit, handleCancel, handleTab }: KeyboardHandlers
) => {
  if (e.key === 'Tab') {
    e.preventDefault()
    if (e.shiftKey) handleTab('back')
    else handleTab('forward')
  } else if (e.key === 'Enter' && !e.shiftKey) handleEdit()
  else if (e.key === 'Escape') handleCancel()
}

export const StringValue: React.FC<InputProps & { value: string }> = ({
  value,
  setValue,
  isEditing,
  path,
  setIsEditing,
  stringTruncate,
  showStringQuotes,
  nodeData,
  ...keyboardHandlers
}) => {
  const { getStyles } = useTheme()

  const pathString = toPathString(path)

  const quoteChar = showStringQuotes ? '"' : ''

  return isEditing ? (
    <AutogrowTextArea
      className="jer-input-text"
      name={pathString}
      value={value}
      setValue={setValue as React.Dispatch<React.SetStateAction<string>>}
      isEditing={isEditing}
      handleKeyPress={(e) => handleCommonKeyEvents(e, keyboardHandlers)}
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
  nodeData,
  ...keyboardHandlers
}) => {
  const { getStyles } = useTheme()
  const handleKeyPress = (e: React.KeyboardEvent) => {
    handleCommonKeyEvents(e, keyboardHandlers)
    switch (e.key) {
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
  nodeData,
  ...keyboardHandlers
}) => {
  const { getStyles } = useTheme()

  return isEditing ? (
    <input
      className="jer-input-boolean"
      type="checkbox"
      name={toPathString(path)}
      checked={value}
      onChange={() => setValue(!value)}
      onKeyDown={(e) => handleCommonKeyEvents(e, keyboardHandlers)}
      autoFocus
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
  nodeData,
  ...keyboardHandlers
}) => {
  const { getStyles } = useTheme()

  useEffect(() => {
    if (isEditing) document.addEventListener('keydown', listenForSubmit)
    return () => document.removeEventListener('keydown', listenForSubmit)
  }, [isEditing])

  const listenForSubmit = (event: any) => {
    handleCommonKeyEvents(event, keyboardHandlers)
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
