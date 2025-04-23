import React from 'react'
import { toPathString, StringEdit, type CustomNodeProps } from '@json-edit-react'

export interface BigIntProps {
  style?: React.CSSProperties
  descriptionStyle?: React.CSSProperties
}

export const BigIntComponent: React.FC<CustomNodeProps<BigIntProps>> = (props) => {
  const {
    setValue,
    isEditing,
    setIsEditing,
    getStyles,
    nodeData,
    customNodeProps = {},
    value,
    handleEdit,
    ...rest
  } = props
  const { path } = nodeData
  const { style = { color: '#006291', fontSize: '90%' } } = customNodeProps

  const editDisplayValue = typeof value === 'bigint' ? String(value) : (value as string)

  return isEditing ? (
    <StringEdit
      pathString={toPathString(path)}
      styles={getStyles('input', nodeData)}
      value={editDisplayValue}
      setValue={setValue as React.Dispatch<React.SetStateAction<string>>}
      {...rest}
      handleEdit={() => {
        handleEdit(BigInt(nodeData.value as string))
      }}
    />
  ) : (
    <span onDoubleClick={() => setIsEditing(true)} style={style}>
      {value as bigint}
    </span>
  )
}
