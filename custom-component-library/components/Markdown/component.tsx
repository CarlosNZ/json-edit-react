/**
 * An Markdown display Custom Component
 *
 * Uses react-markdown to render the markdown content
 */

import React from 'react'
import { type CustomNodeProps } from '@json-edit-react'
import Markdown, { Options } from 'react-markdown'

export type ReactMarkdownProps = Options

export const MarkdownComponent: React.FC<CustomNodeProps<ReactMarkdownProps>> = (props) => {
  const { setIsEditing, getStyles, nodeData } = props
  const styles = getStyles('string', nodeData)

  return (
    <div
      onClick={(e) => {
        if (e.getModifierState('Control') || e.getModifierState('Meta')) setIsEditing(true)
      }}
      onDoubleClick={() => setIsEditing(true)}
      style={{ ...styles }}
      className="jer-markdown-block"
    >
      <Markdown {...props.customNodeProps}>{nodeData.value as string}</Markdown>
    </div>
  )
}
