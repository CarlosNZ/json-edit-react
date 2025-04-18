/**
 * Boolean Toggle
 */

import React from 'react'
import { toPathString, type CustomNodeProps } from '@json-edit-react'

export const BooleanToggleComponent: React.FC<CustomNodeProps> = (props) => {
  const { nodeData, value, handleEdit, canEdit } = props
  const { path } = nodeData
  return (
    <input
      className="jer-input-boolean"
      type="checkbox"
      disabled={!canEdit}
      name={toPathString(path)}
      checked={value as boolean}
      onChange={() => {
        // In this case we submit the data value immediately, not just the local
        // state
        handleEdit(!nodeData.value)
        // setValue(!value)
      }}
    />
  )
}
