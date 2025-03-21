import React, { useEffect, useRef, useState } from 'react'
import { AutogrowTextArea } from './AutogrowTextArea'
import { insertCharInTextArea, toPathString } from './helpers'
import { useTheme } from './contexts'
import { type NodeData, type InputProps, EnumDefinition } from './types'
import { type TranslateFunction } from './localisation'

export const INVALID_FUNCTION_STRING = '**INVALID_FUNCTION**'

interface StringDisplayProps {
  nodeData: NodeData
  styles: React.CSSProperties
  pathString: string
  showStringQuotes?: boolean
  stringTruncate?: number
  canEdit: boolean
  setIsEditing: (value: React.SetStateAction<boolean>) => void
  translate: TranslateFunction
}
export const StringDisplay: React.FC<StringDisplayProps> = ({
  nodeData,
  showStringQuotes = true,
  stringTruncate = 200,
  pathString,
  canEdit,
  setIsEditing,
  styles,
  translate,
}) => {
  const value = nodeData.value as string
  const [isExpanded, setIsExpanded] = useState(false)

  const quoteChar = showStringQuotes ? '"' : ''

  const requiresTruncation = value.length > stringTruncate

  const handleMaybeEdit = () => {
    canEdit ? setIsEditing(true) : setIsExpanded(!isExpanded)
  }

  return (
    <div
      id={`${pathString}_display`}
      onDoubleClick={handleMaybeEdit}
      onClick={(e) => {
        if (e.getModifierState('Control') || e.getModifierState('Meta')) handleMaybeEdit()
      }}
      className="jer-value-string"
      style={styles}
    >
      {quoteChar}
      {!requiresTruncation ? (
        `${value}${quoteChar}`
      ) : isExpanded ? (
        <>
          <span>
            {value}
            {quoteChar}
          </span>
          <span className="jer-string-expansion jer-show-less" onClick={() => setIsExpanded(false)}>
            {' '}
            {translate('SHOW_LESS', nodeData)}
          </span>
        </>
      ) : (
        <>
          <span>{value.slice(0, stringTruncate - 2).trimEnd()}</span>
          <span className="jer-string-expansion jer-ellipsis" onClick={() => setIsExpanded(true)}>
            ...
          </span>
          {quoteChar}
        </>
      )}
    </div>
  )
}

export const StringValue: React.FC<InputProps & { value: string; enumType?: EnumDefinition }> = ({
  value,
  setValue,
  isEditing,
  path,
  handleEdit,
  nodeData,
  handleKeyboard,
  keyboardCommon,
  enumType,
  ...props
}) => {
  const { getStyles } = useTheme()

  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  const pathString = toPathString(path)

  if (isEditing && enumType) {
    return (
      <div className="jer-select">
        <select
          name={`${pathString}-value-select`}
          className="jer-select-inner"
          onChange={(e) => setValue(e.target.value)}
          value={value}
        >
          {enumType.values.map((val) => {
            return (
              <option value={val} key={val}>
                {val}
              </option>
            )
          })}
        </select>
        <span className="focus"></span>
      </div>
    )
  }

  return isEditing ? (
    <AutogrowTextArea
      className="jer-input-text"
      textAreaRef={textAreaRef}
      name={pathString}
      value={value}
      setValue={setValue as React.Dispatch<React.SetStateAction<string>>}
      isEditing={isEditing}
      handleKeyPress={(e) => {
        handleKeyboard(e, {
          stringConfirm: handleEdit,
          stringLineBreak: () => {
            // Simulates standard text-area line break behaviour. Only
            // required when control key is not "standard" text-area
            // behaviour ("Shift-Enter" or "Enter")
            const newValue = insertCharInTextArea(
              textAreaRef as React.MutableRefObject<HTMLTextAreaElement>,
              '\n'
            )
            setValue(newValue)
          },
          ...keyboardCommon,
        })
      }}
      styles={getStyles('input', nodeData)}
    />
  ) : (
    <StringDisplay
      nodeData={nodeData}
      pathString={pathString}
      styles={getStyles('string', nodeData)}
      {...props}
    />
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
      onFocus={(e) => setTimeout(() => e.target.select(), 10)}
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
      onKeyDown={(e) => {
        // If we don't explicitly suppress normal checkbox keyboard behaviour,
        // the default key (Space) will continue to work even if re-defined
        if (e.key === ' ') e.preventDefault()
        handleKeyboard(e, {
          booleanConfirm: handleEdit,
          booleanToggle: () => setValue(!value),
          ...keyboardCommon,
        })
      }}
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
  const timer = useRef<number | undefined>()

  useEffect(() => {
    if (!isEditing) {
      // The listener messes with other elements when switching rapidly (e.g. when "getNext" called repeatedly on inaccessible elements), so we cancel the listener load before it even happens if this node gets switched from isEditing to not in less than 100ms
      window.clearTimeout(timer.current)
      return
    }
    // Small delay to prevent registering keyboard input from previous element
    // if switched using "Tab"
    timer.current = window.setTimeout(
      () => window.addEventListener('keydown', listenForSubmit),
      100
    )

    return () => window.removeEventListener('keydown', listenForSubmit)
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
