import React from 'react'
import { CustomNodeProps } from './types'
import { useTheme } from './theme'
import './style.css'

export const CustomNodeWrapper: React.FC<CustomNodeProps> = ({
  name,
  path,
  showArrayIndices,
  children,
}) => {
  const { styles } = useTheme()

  return (
    <div className="jer-component jer-value-component">
      <div
        className="jer-value-main-row"
        style={{
          flexWrap: (name as string).length > 10 ? 'wrap' : 'nowrap',
        }}
      >
        {showArrayIndices && (
          <label
            htmlFor={path.join('.')}
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
        <div className="jer-value-and-buttons">{children}</div>
      </div>
    </div>
  )
}
