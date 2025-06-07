/**
 * A custom "URL" renderer -- an object that has "text" and "url" properties,
 * but is displayed as a clickable string
 */

import React, { useState } from 'react'
import { toPathString, StringDisplay, StringEdit, type CustomNodeProps } from '@json-edit-react'

export interface EnhancedLinkProps {
  linkStyles?: React.CSSProperties
  propertyStyles?: React.CSSProperties
  labels?: { text: string; url: string }
  fieldNames?: { text: string; url: string }
  stringTruncate?: number
  [key: string]: unknown
}

type EnhancedLink = {
  [key: string]: string
}

export const EnhancedLinkCustomComponent: React.FC<CustomNodeProps<EnhancedLinkProps>> = (
  props
) => {
  const { setIsEditing, getStyles, nodeData, customNodeProps = {}, isEditing, handleEdit } = props
  const {
    linkStyles = { fontWeight: 'bold', textDecoration: 'underline' },
    propertyStyles = {},
    labels: { text: textLabel, url: urlLabel } = { text: 'Text', url: 'Link' },
    fieldNames: { text: textField, url: urlField } = { text: 'text', url: 'url' },
    stringTruncate = 120,
  } = customNodeProps
  const [text, setText] = useState((nodeData.value as EnhancedLink)[textField])
  const [url, setUrl] = useState((nodeData.value as EnhancedLink)[urlField])

  const styles = getStyles('string', nodeData)

  return (
    <div
      onClick={(e) => {
        if (e.getModifierState('Control') || e.getModifierState('Meta')) setIsEditing(true)
      }}
      style={styles}
    >
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3em', marginTop: '0.4em' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            <span style={propertyStyles}>{textLabel}:</span>
            <StringEdit
              styles={getStyles('input', nodeData)}
              pathString={toPathString(nodeData.path)}
              {...props}
              value={text}
              setValue={(val) => setText(val)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            <span style={propertyStyles}>{urlLabel}:</span>
            <StringEdit
              styles={getStyles('input', nodeData)}
              pathString={toPathString(nodeData.path)}
              {...props}
              value={url}
              setValue={(val) => setUrl(val)}
              handleEdit={() => {
                handleEdit({ [textField]: text, [urlField]: url })
              }}
            />
          </div>
        </div>
      ) : (
        <StringDisplay
          {...props}
          pathString={toPathString(nodeData.path)}
          styles={{ ...styles }}
          value={text}
          stringTruncate={stringTruncate}
          TextWrapper={({ children }) => {
            return (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                style={{ ...styles, ...linkStyles, cursor: 'pointer' }}
              >
                {children}
              </a>
            )
          }}
        />
      )}
    </div>
  )
}
