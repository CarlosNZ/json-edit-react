import { InputProps } from './types'
import './style.css'
import { useState } from 'react'

export const StringValue: React.FC<InputProps> = ({
  value,
  setValue,
  isEditing,
  path,
  setIsEditing,
  handleEdit,
  handleCancel,
}) => {
  const [scrollHeight, setScrollHeight] = useState(20)
  const [maxColumns, setMaxColumns] = useState(10)
  const [rowNum, setRowNum] = useState(1)
  const [scrollWidth, setScrollWidth] = useState(121)

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

  const cols = Math.max(...(value as string).split('\n').map((line) => line.length)) + 4

  // const rows = scrollHeight > 30 ? 5 : 1

  return isEditing ? (
    <textarea
      cols={maxColumns}
      className="fg-input-text"
      name={path.join('.')}
      value={value as string}
      onChange={(e) => {
        console.log(e.target.scrollWidth)
        // console.log(e.target.clientHeight)
        // setScrollHeight(e.target.scrollHeight)
        if (e.target.scrollWidth === scrollWidth && scrollWidth > 300) setRowNum(5)
        if (e.target.scrollWidth > scrollWidth) setScrollWidth(e.target.scrollWidth)
        if (cols > maxColumns) setMaxColumns(cols)
        setValue(e.target.value)
      }}
      autoFocus
      onFocus={(e) => e.target.select()}
      rows={rowNum}
      style={{ height: 'unset' }}
      onKeyDown={handleKeyPress}
    />
  ) : (
    <span onDoubleClick={() => setIsEditing(true)} className="fg-value-string">
      "{breakString(value as string)}"
    </span>
  )
}

const calculateTextAreaHeight = (newVal: string, currVal: string, scrollHeight: number) => {
  if (newVal.length > currVal.length) return scrollHeight
  else return 20
}

const calculateTextAreaWidth = () => {}

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

  const validateNumber = (input: string) => {
    return input.replace(/[^0-9.-]/g, '')
  }

  return isEditing ? (
    <input
      className="fg-input-number"
      type="text"
      name={path.join('.')}
      value={value as number}
      onChange={(e) => setValue(validateNumber(e.target.value))}
      autoFocus
      onFocus={(e) => e.target.select()}
      onKeyDown={handleKeyPress}
      style={{ width: `${String(value).length / 1.5 + 2}em` }}
    />
  ) : (
    <span onDoubleClick={() => setIsEditing(true)} className="fg-value-number">
      {value as number}
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
