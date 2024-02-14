/**
 * An example Custom Component:
 * https://github.com/CarlosNZ/json-edit-react#custom-nodes
 *
 * A simple custom node which detects urls in data and makes them active
 * hyperlinks.
 */

import React from 'react'
import { truncate } from '../../src/ValueNodes'
import { type CustomNodeProps, type CustomNodeDefinition } from '../types'

export const LinkCustomComponent: React.FC<CustomNodeProps<{ stringTruncate?: number }>> = ({
  value,
  setIsEditing,
  getStyles,
  customNodeProps,
  nodeData,
}) => {
  const stringTruncateLength = customNodeProps?.stringTruncate ?? 100
  const styles = getStyles('string', nodeData)
  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      onClick={(e) => {
        if (e.getModifierState('Control') || e.getModifierState('Meta')) setIsEditing(true)
      }}
      className="jer-value-string jer-hyperlink"
      style={styles}
    >
      <a
        href={value as string}
        target="_blank"
        rel="noreferrer"
        style={{ color: styles.color ?? undefined }}
      >
        &quot;{truncate(value as string, stringTruncateLength)}&quot;
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
