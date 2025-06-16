/**
 * A Colour picker Custom Component
 */

import React, { lazy, Suspense } from 'react'
import { type CustomNodeProps } from '@json-edit-react'
import { Loading } from '../_common/Loading'

const HexColorPicker = lazy(() =>
  import('react-colorful').then((m) => ({ default: m.HexColorPicker }))
)
const HexColorInput = lazy(() =>
  import('react-colorful').then((m) => ({ default: m.HexColorInput }))
)

export interface ColorPickerProps {
  loadingText?: string
}

export const ColorPickerComponent: React.FC<CustomNodeProps<ColorPickerProps>> = ({
  value,
  setValue,
  getStyles,
  nodeData,
  customNodeProps = {},
}) => {
  const { loadingText } = customNodeProps

  const inputStyle = getStyles('input', nodeData)
  const stringStyle = getStyles('string', nodeData)

  return (
    <Suspense
      fallback={
        <div style={stringStyle}>
          <Loading text={loadingText} />
        </div>
      }
    >
      <div style={{ position: 'relative' }}>
        <HexColorInput style={inputStyle} color={value as string} onChange={setValue} prefixed />
        <HexColorPicker
          style={{
            position: 'absolute',
            bottom: '1.5em',
            zIndex: 1000,
            boxShadow: 'rgba(0, 0, 0, 0.35) 0px 5px 15px',
            borderRadius: '8px',
          }}
          color={value as string}
          onChange={setValue}
        />
      </div>
    </Suspense>
  )
}
