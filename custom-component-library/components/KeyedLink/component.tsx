/**
 * Custom Key + Element pair — link icon in key, anchor in value
 *
 * Demonstrates that a single `CustomNodeDefinition` can target BOTH the key
 * slot (`customKey`) and the value slot (`element`) on the same node.
 */

import React from 'react'
import { type CustomKeyProps, type CustomNodeProps } from '@json-edit-react'

export const KeyedLinkKeyComponent: React.FC<CustomKeyProps> = ({
  name,
  canEditKey,
  styles,
  handleClick,
  setIsEditingKey,
}) => {
  const displayKey = String(name)
  return (
    <span
      className="jer-key-text"
      style={{
        ...styles,
        minWidth: `${Math.min(displayKey.length + 2, 6)}ch`,
      }}
      onClick={handleClick}
      onDoubleClick={() => canEditKey && setIsEditingKey()}
    >
      <span style={{ marginRight: '0.25em' }} aria-hidden="true">
        🔗
      </span>
      {displayKey}
      <span className="jer-key-colon">:</span>
    </span>
  )
}

export const KeyedLinkValueComponent: React.FC<CustomNodeProps> = ({
  nodeData,
  getStyles,
  setIsEditing,
}) => {
  const url = nodeData.value as string
  const styles = getStyles('string', nodeData)
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      style={{ ...styles, textDecoration: 'underline', cursor: 'pointer' }}
      onClick={(e) => {
        if (e.getModifierState('Control') || e.getModifierState('Meta')) {
          e.preventDefault()
          setIsEditing(true)
        }
      }}
    >
      {url}
    </a>
  )
}
