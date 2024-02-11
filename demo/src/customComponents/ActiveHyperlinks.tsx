/**
 * An example Custom Component:
 * https://github.com/CarlosNZ/json-edit-react#custom-nodes
 *
 * A simple custom node which detects urls in data and makes them active
 * hyperlinks.
 */

import React from 'react'
import { CustomNodeProps, CustomNodeDefinition } from '../JsonEditImport'

// Styles
// For better matching with Chakra-UI
import './style.css'
import { truncate } from '../json-edit-react/src/ValueNodes'

export const Link: React.FC<CustomNodeProps> = ({
  value,
  setIsEditing,
  styles,
  stringTruncate,
}) => {
  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      onClick={(e) => {
        if (e.getModifierState('Control') || e.getModifierState('Meta')) setIsEditing(true)
      }}
      className="jer-value-string"
      style={styles.string}
    >
      <a href={value as string} target="_blank" rel="noreferrer">
        "{truncate(value as string, stringTruncate)}"
      </a>
    </div>
  )
}

// Definition for custom node behaviour
export const linkNodeDefinition: CustomNodeDefinition = {
  // Condition is a regex to match url strings
  condition: ({ value }) => typeof value === 'string' && /^https?:\/\/.+\..+$/.test(value),
  element: Link, // the component defined above
  showOnView: true,
  showOnEdit: false,
}
