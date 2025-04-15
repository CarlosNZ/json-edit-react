import React, { useRef } from 'react'
import { StringDisplay, toPathString, StringEdit, type CustomNodeProps } from 'json-edit-react'

export interface DateObjectProps {
  showTime?: boolean
}

export const DateObjectCustomComponent: React.FC<CustomNodeProps<DateObjectProps>> = (props) => {
  const {
    nodeData,
    isEditing,
    setValue,
    getStyles,
    canEdit,
    value,
    handleEdit,
    onError,
    customNodeProps = {},
  } = props
  const lastValidDate = useRef(value)

  const { showTime = true } = customNodeProps

  if (value instanceof Date) lastValidDate.current = value

  const editDisplayValue =
    value instanceof Date
      ? showTime
        ? value.toISOString()
        : value.toDateString()
      : (value as string)
  const displayValue = showTime
    ? nodeData.value.toLocaleString()
    : (nodeData.value as Date).toLocaleDateString()

  return isEditing ? (
    <StringEdit
      styles={getStyles('input', nodeData)}
      pathString={toPathString(nodeData.path)}
      {...props}
      value={editDisplayValue}
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
      value={displayValue}
    />
  )
}
