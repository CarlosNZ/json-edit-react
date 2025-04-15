import React from 'react'
import { StringDisplay, toPathString, StringEdit, type CustomNodeProps } from 'json-edit-react'

export const DateObjectCustomComponent: React.FC<CustomNodeProps<unknown>> = (props) => {
  const { nodeData, isEditing, setValue, getStyles, canEdit, value, handleEdit } = props
  return isEditing ? (
    <StringEdit
      styles={getStyles('input', nodeData)}
      pathString={toPathString(nodeData.path)}
      {...props}
      value={value instanceof Date ? value.toISOString() : (value as string)}
      setValue={setValue as React.Dispatch<React.SetStateAction<string>>}
      handleEdit={() => {
        const newDate = new Date(value as string)
        handleEdit(newDate as any)
      }}
    />
  ) : (
    <StringDisplay
      {...props}
      styles={getStyles('string', nodeData)}
      canEdit={canEdit}
      pathString={toPathString(nodeData.path)}
      value={nodeData.value.toLocaleString()}
    />
  )
}
