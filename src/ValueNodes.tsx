import React, { useEffect, useState } from 'react'
import { InputProps } from './types'
import './style.css'

export const StringValue: React.FC<InputProps & { value: string }> = ({
  value,
  setValue,
  isEditing,
  path,
  setIsEditing,
  handleEdit,
  handleCancel,
}) => {
  const [scrollHeight, setScrollHeight] = useState(20)
  const cols = Math.max(...value.split('\n').map((line) => line.length)) + 4
  const [maxColumns, setMaxColumns] = useState(cols)
  const [textAreaId] = useState(`fg-${Math.ceil(Math.random() * 1000000)}`)
  const [colWidth, setColWidth] = useState()

  useEffect(() => {
    if (!isEditing) return
    setColWidth((document.getElementById(textAreaId) as any)?.cols)
  }, [isEditing])

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

  // const cols2 = (document.getElementById(textAreaId) as any)?.cols
  // console.log('Cols', colWidth)

  return isEditing ? (
    <textarea
      id={textAreaId}
      // cols={1000}
      className="fg-input-text"
      name={path.join('.')}
      value={value}
      onChange={(e) => {
        setScrollHeight(e.target.scrollHeight)
        if (cols > maxColumns) setMaxColumns(cols)
        setValue(e.target.value)
      }}
      autoFocus
      onFocus={(e) => e.target.select()}
      // style={{ height: scrollHeight - 3 }}
      onKeyDown={handleKeyPress}
      style={{ width: '100%' }}
    />
  ) : (
    <span onDoubleClick={() => setIsEditing(true)} className="fg-value-string">
      "{breakString(value)}"
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
      className="fg-input-number"
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
    <span onDoubleClick={() => setIsEditing(true)} className="fg-value-number">
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
      className="fg-input-boolean"
      type="checkbox"
      name={path.join('.')}
      checked={value}
      onChange={() => setValue(!value)}
    />
  ) : (
    <span onDoubleClick={() => setIsEditing(true)} className="fg-value-boolean">
      {String(value)}
    </span>
  )
}

export const NullValue: React.FC<InputProps> = ({ value, isEditing, setIsEditing }) =>
  isEditing ? (
    <div className="fg-input-null">null</div>
  ) : (
    <div onDoubleClick={() => setIsEditing(true)} className="fg-value-null">
      {String(value)}
    </div>
  )

export const ObjectValue: React.FC<InputProps> = () => {
  return <span className="fg-value-object">{'{ }'}</span>
}

export const ArrayValue: React.FC<InputProps> = ({ value }) => {
  return <span className="fg-value-array">{`[${value === null ? '' : value}]`}</span>
}

export const InvalidValue: React.FC<InputProps> = () => {
  return <span className="fg-value-invalid">Invalid value</span>
}
