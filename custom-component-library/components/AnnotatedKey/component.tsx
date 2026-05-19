/**
 * Custom Key Component — annotated key with subscript label
 *
 * Renders the key followed by a small subscript describing what it means.
 * The annotations map is passed via `customNodeProps`, demonstrating that
 * a definition's typed `customNodeProps` is shared between the `element`
 * slot and the `customKey` slot.
 */

import React from 'react'
import { type CustomKeyProps } from '@json-edit-react'

export interface AnnotationProps {
  annotations?: Record<string, string>
}

export const AnnotatedKeyComponent: React.FC<CustomKeyProps<AnnotationProps>> = ({
  name,
  path,
  canEditKey,
  styles,
  handleClick,
  setIsEditingKey,
  customNodeProps,
}) => {
  const displayKey = String(name)
  const annotation = customNodeProps?.annotations?.[displayKey]
  return (
    <span
      className="jer-key-text"
      style={{
        ...styles,
        minWidth: `${Math.min(displayKey.length + 1, 5)}ch`,
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '0.35em',
      }}
      onClick={handleClick}
      onDoubleClick={() => canEditKey && setIsEditingKey()}
      data-path={path.join('.')}
    >
      <span>{displayKey}</span>
      {annotation && (
        <span
          style={{
            fontSize: '0.7em',
            fontStyle: 'italic',
            opacity: 0.6,
            whiteSpace: 'nowrap',
          }}
        >
          ({annotation})
        </span>
      )}
      <span className="jer-key-colon">:</span>
    </span>
  )
}
