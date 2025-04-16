/**
 * An URL display Custom Component
 *
 * A simple custom node which detects urls in data and makes them active
 * hyperlinks.
 */

import React from 'react'
import { toPathString, StringDisplay, type CustomNodeProps } from '@json-edit-react'

export interface LinkProps {
  linkStyles?: React.CSSProperties
  stringTruncate?: number
  [key: string]: unknown
}

export const LinkCustomComponent: React.FC<CustomNodeProps<LinkProps>> = (props) => {
  const { setIsEditing, getStyles, nodeData, customNodeProps = {} } = props
  const styles = getStyles('string', nodeData)
  const { linkStyles = { fontWeight: 'bold', textDecoration: 'underline' }, stringTruncate = 60 } =
    customNodeProps
  return (
    <div
      onClick={(e) => {
        if (e.getModifierState('Control') || e.getModifierState('Meta')) setIsEditing(true)
      }}
      style={styles}
    >
      <StringDisplay
        {...props}
        pathString={toPathString(nodeData.path)}
        styles={{ ...styles }}
        value={nodeData.value as string}
        stringTruncate={stringTruncate}
        TextWrapper={({ children }) => {
          return (
            <a
              href={nodeData.value as string}
              target="_blank"
              rel="noreferrer"
              style={{ ...styles, ...linkStyles, cursor: 'pointer' }}
            >
              {children}
            </a>
          )
        }}
      />
    </div>
  )
}
