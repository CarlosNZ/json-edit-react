/**
 * An example Custom Component:
 * https://github.com/CarlosNZ/json-edit-react#custom-nodes
 *
 * A simple custom node which detects urls in data and makes them active
 * hyperlinks.
 */

import React from 'react'
import {
  StringDisplay,
  toPathString,
  StringEdit,
  type CustomNodeProps,
  type ValueNodeProps,
} from 'json-edit-react'

export const DateObjectCustomComponent: React.FC<
  CustomNodeProps<{ stringTruncate?: number }> & ValueNodeProps
> = (props) => {
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
