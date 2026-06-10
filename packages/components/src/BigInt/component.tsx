import React, { useRef } from 'react'
import { toPathString, StringEdit, type CustomComponentProps } from 'json-edit-react'

export interface BigIntProps {
  style?: React.CSSProperties
  descriptionStyle?: React.CSSProperties
}

export const BigIntComponent: React.FC<CustomComponentProps<BigIntProps>> = (props) => {
  const {
    setValue,
    isEditing,
    setIsEditing,
    getStyles,
    nodeData,
    componentProps = {},
    value,
    handleEdit,
    onError,
    ...rest
  } = props
  const { path } = nodeData
  const { style = { color: '#006291', fontSize: '90%' } } = componentProps
  const lastValidValue = useRef(value)

  if (typeof value === 'bigint') lastValidValue.current = value

  const editDisplayValue = typeof value === 'bigint' ? String(value) : (value as string)

  return isEditing ? (
    <StringEdit
      pathString={toPathString(path)}
      styles={getStyles('input', nodeData)}
      value={editDisplayValue}
      setValue={setValue as React.Dispatch<React.SetStateAction<string>>}
      {...rest}
      handleEdit={() => {
        try {
          // BigInt() throws on anything non-integer ("1.5", "abc", "1e3")
          handleEdit(BigInt(editDisplayValue))
        } catch {
          handleEdit(lastValidValue.current)
          onError({ code: 'UPDATE_ERROR', message: 'Invalid BigInt' }, value)
        }
      }}
    />
  ) : (
    <span onDoubleClick={() => setIsEditing(true)} style={style}>
      {value as bigint}
    </span>
  )
}
