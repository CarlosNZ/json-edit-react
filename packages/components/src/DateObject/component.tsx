import React from 'react'
import { StringDisplay, toPathString, StringEdit, type CustomComponentProps } from 'json-edit-react'

export interface DateObjectProps {
  showTime?: boolean
  invalidDateError?: string
}

export const DateObjectCustomComponent: React.FC<CustomComponentProps<DateObjectProps>> = (props) => {
  const { nodeData, isEditing, setValue, getStyles, canEdit, value, componentProps = {} } = props

  const { showTime = true } = componentProps

  const editDisplayValue =
    value instanceof Date
      ? showTime
        ? value.toISOString()
        : value.toDateString()
      : (value as string)
  const displayValue = showTime
    ? (nodeData.value as Date).toLocaleString()
    : (nodeData.value as Date).toLocaleDateString()

  // Every confirm path funnels through core's no-arg `handleEdit` (passed via
  // the props spread); the definition's `fromEditBuffer` parses and validates
  // the buffer string as a Date (or rejects).
  return isEditing ? (
    <StringEdit
      styles={getStyles('input', nodeData)}
      pathString={toPathString(nodeData.path)}
      {...props}
      value={editDisplayValue}
      setValue={setValue as React.Dispatch<React.SetStateAction<string>>}
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
