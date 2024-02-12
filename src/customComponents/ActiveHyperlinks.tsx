/**
 * An example Custom Component:
 * https://github.com/CarlosNZ/json-edit-react#custom-nodes
 *
 * A simple custom node which detects urls in data and makes them active
 * hyperlinks.
 */

import React from 'react'
import { truncate } from '../../src/ValueNodes'
import { CustomNodeProps, CustomNodeDefinition } from '../types'

export const LinkCustomComponent: React.FC<CustomNodeProps<{ stringTruncate?: number }>> = ({
  value,
  setIsEditing,
  styles,
  customNodeProps,
}) => {
  const stringTruncateLength = customNodeProps?.stringTruncate ?? 100
  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      onClick={(e) => {
        if (e.getModifierState('Control') || e.getModifierState('Meta')) setIsEditing(true)
      }}
      className="jer-value-string jer-hyperlink"
      style={styles.string}
    >
      <a href={value as string} target="_blank" rel="noreferrer">
        "{truncate(value as string, stringTruncateLength)}"
      </a>
    </div>
  )
}

// Definition for custom node behaviour
export const LinkCustomNodeDefinition: CustomNodeDefinition = {
  // Condition is a regex to match url strings
  condition: ({ value }) => typeof value === 'string' && /^https?:\/\/.+\..+$/.test(value),
  element: LinkCustomComponent, // the component defined above
  showOnView: true,
  showOnEdit: false,
}
