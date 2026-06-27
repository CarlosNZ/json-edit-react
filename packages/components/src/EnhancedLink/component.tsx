/**
 * A custom "URL" renderer -- an object that has "text" and "url" properties,
 * but is displayed as a clickable string
 */

import React from 'react'
import { toPathString, StringDisplay, StringEdit, type CustomComponentProps } from 'json-edit-react'

export interface EnhancedLinkProps {
  linkStyles?: React.CSSProperties
  propertyStyles?: React.CSSProperties
  labels?: { text: string; url: string }
  fieldNames?: { text: string; url: string }
  stringTruncateLength?: number
  [key: string]: unknown
}

type EnhancedLink = {
  [key: string]: string
}

export const EnhancedLinkCustomComponent: React.FC<CustomComponentProps<EnhancedLinkProps>> = (
  props
) => {
  const {
    setIsEditing,
    getStyles,
    nodeData,
    componentProps = {},
    isEditing,
    value,
    setValue,
  } = props
  const {
    linkStyles = { fontWeight: 'bold', textDecoration: 'underline' },
    propertyStyles = {},
    labels: { text: textLabel, url: urlLabel } = { text: 'Text', url: 'Link' },
    fieldNames: { text: textField, url: urlField } = { text: 'text', url: 'url' },
    stringTruncateLength = 120,
  } = componentProps
  const linkData = (value ?? {}) as EnhancedLink
  const text = linkData[textField]
  const url = linkData[urlField]

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
              setValue={
                ((val: string) => setValue({ ...linkData, [textField]: val })) as React.Dispatch<
                  React.SetStateAction<string>
                >
              }
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            <span style={propertyStyles}>{urlLabel}:</span>
            <StringEdit
              styles={getStyles('input', nodeData)}
              pathString={toPathString(nodeData.path)}
              {...props}
              value={url}
              setValue={
                ((val: string) => setValue({ ...linkData, [urlField]: val })) as React.Dispatch<
                  React.SetStateAction<string>
                >
              }
            />
          </div>
        </div>
      ) : (
        <StringDisplay
          {...props}
          pathString={toPathString(nodeData.path)}
          styles={{ ...styles }}
          value={text}
          stringTruncateLength={stringTruncateLength}
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
