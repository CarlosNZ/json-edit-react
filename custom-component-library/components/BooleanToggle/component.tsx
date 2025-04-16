/**
 * Boolean Toggle
 */

import React from 'react'
import { toPathString, type CustomNodeProps } from '../_imports'

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
        handleEdit(!nodeData.value)
        // setValue(!value)
      }}
    />
  )
}
