import React, { useEffect } from 'react'
import { AutogrowTextArea } from './AutogrowTextArea'
import { toPathString, truncate } from './helpers'
import { useTheme } from './contexts'
import { type InputProps } from './types'

export const INVALID_FUNCTION_STRING = '**INVALID_FUNCTION**'

export const StringValue: React.FC<InputProps & { value: string }> = ({
  value,
  setValue,
  isEditing,
  path,
  setIsEditing,
  handleEdit,
  stringTruncate,
  showStringQuotes,
  nodeData,
  handleKeyboard,
  keyboardCommon,
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
      handleKeyPress={(e) => {
        handleKeyboard(e, {
          stringConfirm: handleEdit,
          stringLineBreak: () => {
            const textArea = document.getElementById(
              `${pathString}_textarea`
            ) as HTMLTextAreaElement
            if (textArea) {
              // Simulates standard text-area line break behaviour. Only
              // required when control key is not "standard" text-area
              // behaviour ("Shift-Enter" or "Enter")
              const startPos: number = textArea?.selectionStart ?? Infinity
              const endPos: number = textArea?.selectionEnd ?? Infinity
              const strStart = value.slice(0, startPos)
              const strEnd = value.slice(endPos)
              ;(e.target as HTMLInputElement).value = strStart + '\n' + strEnd
              textArea.setSelectionRange(startPos + 1, startPos + 1)
              setValue(strStart + '\n' + strEnd)
            }
          },
          ...keyboardCommon,
        })
      }}
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
  nodeData,
  handleKeyboard,
  keyboardCommon,
}) => {
  const { getStyles } = useTheme()

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
      onKeyDown={(e) =>
        handleKeyboard(e, {
          numberConfirm: handleEdit,
          numberUp: () => setValue(Number(value) + 1),
          numberDown: () => setValue(Number(value) - 1),
          ...keyboardCommon,
        })
      }
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
  nodeData,
  handleKeyboard,
  keyboardCommon,
}) => {
  const { getStyles } = useTheme()

  return isEditing ? (
    <input
      className="jer-input-boolean"
      type="checkbox"
      name={toPathString(path)}
      checked={value}
      onChange={() => setValue(!value)}
      onKeyDown={(e) =>
        handleKeyboard(e, {
          booleanConfirm: handleEdit,
          ...keyboardCommon,
        })
      }
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
  handleEdit,
  nodeData,
  handleKeyboard,
  keyboardCommon,
}) => {
  const { getStyles } = useTheme()

  useEffect(() => {
    if (isEditing) {
      // Small delay to prevent registering keyboard input from previous element
      // if switched using "Tab"
      setTimeout(() => document.addEventListener('keydown', listenForSubmit), 50)
    }
    return () => document.removeEventListener('keydown', listenForSubmit)
  }, [isEditing])

  const listenForSubmit = (e: unknown) =>
    handleKeyboard(e as React.KeyboardEvent, {
      confirm: handleEdit,
      ...keyboardCommon,
    })

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
