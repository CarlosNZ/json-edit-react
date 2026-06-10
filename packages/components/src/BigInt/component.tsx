import React, { useRef } from 'react'
import { toPathString, StringEdit, type CustomComponentProps } from 'json-edit-react'

export interface BigIntProps {
  style?: React.CSSProperties
  descriptionStyle?: React.CSSProperties
  invalidBigIntError?: string
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
  const { style = { color: '#006291', fontSize: '90%' }, invalidBigIntError = 'Invalid BigInt' } =
    componentProps
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
          // Reset the buffer too — committing the unchanged fallback
          // doesn't alter `data`, so nothing else clears the invalid text
          ;(setValue as (v: unknown) => void)(lastValidValue.current)
          handleEdit(lastValidValue.current)
          onError({ code: 'UPDATE_ERROR', message: invalidBigIntError }, value)
        }
      }}
    />
  ) : (
    <span onDoubleClick={() => setIsEditing(true)} style={style}>
      {value as bigint}
    </span>
  )
}
