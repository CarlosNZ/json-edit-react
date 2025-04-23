import React from 'react'
import { toPathString, StringEdit, type CustomNodeProps } from '@json-edit-react'

export interface SymbolProps {
  style?: React.CSSProperties
  descriptionStyle?: React.CSSProperties
}

export const SymbolComponent: React.FC<CustomNodeProps<SymbolProps>> = (props) => {
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
  const { style = { color: '#006291', fontSize: '90%' }, descriptionStyle = { color: '#ff9300' } } =
    customNodeProps

  const editDisplayValue = typeof value === 'symbol' ? value.description ?? '' : (value as string)

  return isEditing ? (
    <StringEdit
      pathString={toPathString(path)}
      styles={getStyles('input', nodeData)}
      value={editDisplayValue}
      setValue={setValue as React.Dispatch<React.SetStateAction<string>>}
      {...rest}
      handleEdit={() => {
        handleEdit(Symbol(editDisplayValue))
      }}
    />
  ) : (
    <span style={style} onDoubleClick={() => setIsEditing(true)}>
      Symbol(<span style={descriptionStyle}>"{(nodeData.value as symbol).description}"</span>)
    </span>
  )
}
