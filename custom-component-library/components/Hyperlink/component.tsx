/**
 * An example Custom Component:
 * https://github.com/CarlosNZ/json-edit-react#custom-nodes
 *
 * A simple custom node which detects urls in data and makes them active
 * hyperlinks.
 */

import React from 'react'
import {
  toPathString,
  StringDisplay,
  type CustomNodeProps,
  type ValueNodeProps,
} from 'json-edit-react'

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
