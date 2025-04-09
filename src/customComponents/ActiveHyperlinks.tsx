/**
 * An example Custom Component:
 * https://github.com/CarlosNZ/json-edit-react#custom-nodes
 *
 * A simple custom node which detects urls in data and makes them active
 * hyperlinks.
 */

import React from 'react'
import { StringDisplay } from '../../src/ValueNodes'
import { toPathString } from '../helpers'
import { type CustomNodeProps, type CustomNodeDefinition, type ValueNodeProps } from '../types'

export const LinkCustomComponent: React.FC<
  CustomNodeProps<{ stringTruncate?: number }> & ValueNodeProps
> = (props) => {
  const { value, setIsEditing, getStyles, nodeData } = props
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
        <StringDisplay
          {...props}
          pathString={toPathString(nodeData.path)}
          styles={styles}
          value={nodeData.value as string}
        />
      </a>
    </div>
  )
}

// Definition for custom node behaviour
export const LinkCustomNodeDefinition: CustomNodeDefinition = {
  // Condition is a regex to match url strings
  condition: ({ value }) => typeof value === 'string' && /^https?:\/\/.+\..+$/.test(value),
  element: LinkCustomComponent as React.FC<CustomNodeProps>, // the component defined above
  showOnView: true,
  showOnEdit: false,
}
