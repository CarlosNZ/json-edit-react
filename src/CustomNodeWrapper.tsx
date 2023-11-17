import React from 'react'
import { CustomNodeWrapperProps } from './types'
import { useTheme } from './theme'

export const CustomNodeWrapper: React.FC<CustomNodeWrapperProps> = ({
  name,
  hideKey,
  children,
  indent,
}) => {
  const { styles } = useTheme()

  const indentStyle = indent ? { marginLeft: `${indent / 2}em` } : {}

  return (
    <div className="jer-component jer-value-component" style={indentStyle}>
      <div
        className="jer-value-main-row"
        style={{
          flexWrap: (name as string).length > 10 ? 'wrap' : 'nowrap',
        }}
      >
        {!hideKey && (
          <label
            htmlFor={name as string}
            className="jer-object-key"
            style={{
              ...styles.property,
              minWidth: `${Math.min(String(name).length + 1, 5)}ch`,
              flexShrink: (name as string).length > 10 ? 1 : 0,
            }}
          >
            {name}:{' '}
          </label>
        )}
        <div className="jer-value-and-buttons" style={{ paddingLeft: hideKey ? 0 : undefined }}>
          {children}
        </div>
      </div>
    </div>
  )
}
