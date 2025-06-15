/**
 * A Colour picker Custom Component
 */

import React, { lazy, Suspense } from 'react'
import { type CustomNodeProps } from '@json-edit-react'
import { Loading } from '../_common/Loading'

const HexColorPicker = lazy(() =>
  import('react-colorful').then((m) => ({ default: m.HexColorPicker }))
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

  const stringStyle = getStyles('string', nodeData)

  return (
    <Suspense
      fallback={
        <div style={stringStyle}>
          <Loading text={loadingText} />
        </div>
      }
    >
      <HexColorPicker
        color={value as string}
        onChange={setValue}
        style={{
          position: 'absolute',
          top: ' calc(100% + 2px)',
          left: 0,
          borderRadius: 9,
          boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
        }}
      />
    </Suspense>
  )
}
