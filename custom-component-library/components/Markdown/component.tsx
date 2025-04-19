/**
 * An Markdown display Custom Component
 *
 * Uses react-markdown to render the markdown content
 */

import React from 'react'
import { type CustomNodeProps } from '@json-edit-react'
import Markdown from 'react-markdown'

export interface LinkProps {
  linkStyles?: React.CSSProperties
  stringTruncate?: number
  [key: string]: unknown
}

export const MarkdownComponent: React.FC<CustomNodeProps<LinkProps>> = (props) => {
  const { setIsEditing, getStyles, nodeData } = props
  const styles = getStyles('string', nodeData)

  return (
    <div
      onClick={(e) => {
        if (e.getModifierState('Control') || e.getModifierState('Meta')) setIsEditing(true)
      }}
      style={styles}
    >
      {/* TO-DO: Style over-rides, keyboard and double-click behaviour */}
      <Markdown>{nodeData.value as string}</Markdown>
    </div>
  )
}
