/**
 * Custom Key Component — "private" key indicator
 *
 * Renders keys that start with an underscore in italic, prefixed with a small
 * lock icon. Works identically for value nodes and collection nodes, since
 * `customKey` is rendered in the same slot for both.
 */

import React from 'react'
import { type CustomKeyProps } from '@json-edit-react'

export const PrivateKeyComponent: React.FC<CustomKeyProps> = ({
  name,
  path,
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
        fontStyle: 'italic',
        opacity: 0.85,
        minWidth: `${Math.min(displayKey.length + 2, 6)}ch`,
      }}
      onClick={handleClick}
      onDoubleClick={() => canEditKey && setIsEditingKey()}
      title={canEditKey ? `Double-click to edit "${displayKey}"` : displayKey}
      data-path={path.join('.')}
    >
      <span style={{ marginRight: '0.25em' }} aria-hidden="true">
        🔒
      </span>
      {displayKey}
      <span className="jer-key-colon">:</span>
    </span>
  )
}
