/**
 * An Markdown display Custom Component
 *
 * Uses react-markdown to render the markdown content
 */

import React, { lazy, Suspense } from 'react'
import { type CustomComponentProps } from 'json-edit-react'
import { Options } from 'react-markdown'
import { Loading } from '../_common/Loading'

const Markdown = lazy(() => import('react-markdown'))

export interface MarkdownCustomProps extends Options {
  loadingText?: string
}

export const MarkdownComponent: React.FC<CustomComponentProps<MarkdownCustomProps>> = (props) => {
  const { setIsEditing, getStyles, nodeData, componentProps, value } = props
  const styles = getStyles('string', nodeData)

  // react-markdown THROWS on non-string children, which would crash the whole
  // editor tree. A consumer condition (e.g. key-based) can leave this
  // component matched against a non-string value — say, after a type-switch
  // to number — so coerce anything else to its string representation.
  const markdownText = String(value ?? '')

  return (
    <div
      onClick={(e) => {
        if (e.getModifierState('Control') || e.getModifierState('Meta')) setIsEditing(true)
      }}
      onDoubleClick={() => setIsEditing(true)}
      style={{ ...styles }}
      className="jer-markdown-block"
    >
      <Suspense fallback={<Loading text={componentProps?.loadingText ?? 'Loading Markdown'} />}>
        <Markdown {...props.componentProps}>{markdownText}</Markdown>
      </Suspense>
    </div>
  )
}
