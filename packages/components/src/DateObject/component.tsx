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
  // During a deferred type-switch the committed value can be anything (even
  // undefined), so don't assume a Date outside the matched-condition case
  const displayValue =
    nodeData.value instanceof Date
      ? showTime
        ? nodeData.value.toLocaleString()
        : nodeData.value.toLocaleDateString()
      : String(nodeData.value)

  // Every confirm path funnels through core's no-arg `handleEdit` (passed via
  // the props spread); the definition's `fromStandardType` parses and validates
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
