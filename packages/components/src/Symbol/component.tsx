import React from 'react'
import { toPathString, StringEdit, type CustomComponentProps } from 'json-edit-react'

export interface SymbolProps {
  style?: React.CSSProperties
  descriptionStyle?: React.CSSProperties
}

export const SymbolComponent: React.FC<CustomComponentProps<SymbolProps>> = (props) => {
  const {
    setValue,
    isEditing,
    setIsEditing,
    getStyles,
    nodeData,
    componentProps = {},
    value,
    handleEdit,
    ...rest
  } = props
  const { path } = nodeData
  const { style = { color: '#006291', fontSize: '90%' }, descriptionStyle = { color: '#ff9300' } } =
    componentProps

  const editDisplayValue = typeof value === 'symbol' ? (value.description ?? '') : (value as string)

  // Every confirm path funnels through core's no-arg `handleEdit`; the
  // definition's `fromStandardType` converts the buffer string to a Symbol.
  return isEditing ? (
    <StringEdit
      pathString={toPathString(path)}
      styles={getStyles('input', nodeData)}
      value={editDisplayValue}
      setValue={setValue as React.Dispatch<React.SetStateAction<string>>}
      {...rest}
      handleEdit={handleEdit}
    />
  ) : (
    <span style={style} onDoubleClick={() => setIsEditing(true)}>
      Symbol(<span style={descriptionStyle}>"{(nodeData.value as symbol).description}"</span>)
    </span>
  )
}
