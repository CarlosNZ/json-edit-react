import React, { useRef } from 'react'
import { StringDisplay, toPathString, StringEdit, type CustomNodeProps } from 'json-edit-react'

export const DateObjectCustomComponent: React.FC<CustomNodeProps<unknown>> = (props) => {
  const { nodeData, isEditing, setValue, getStyles, canEdit, value, handleEdit, onError } = props
  const lastValidDate = useRef(value)

  if (value instanceof Date) lastValidDate.current = value

  return isEditing ? (
    <StringEdit
      styles={getStyles('input', nodeData)}
      pathString={toPathString(nodeData.path)}
      {...props}
      value={value instanceof Date ? value.toISOString() : (value as string)}
      setValue={setValue as React.Dispatch<React.SetStateAction<string>>}
      handleEdit={() => {
        const newDate = new Date(value as string)
        try {
          // Check if date is valid by trying to convert to ISO
          newDate.toISOString()
          handleEdit(newDate)
        } catch {
          handleEdit(lastValidDate.current)
          onError({ code: 'UPDATE_ERROR', message: 'Invalid Date' }, value)
        }
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
