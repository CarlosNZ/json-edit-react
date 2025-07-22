/**
 * A Colour picker Custom Component
 *
 * Can handle named colours, Hex, RGB and HSL formats, with an optional alpha
 * channel
 */

import React, { lazy, Suspense, useRef } from 'react'
import { HsvColor } from 'react-colorful'
import { colord, extend, getFormat, HsvaColor } from 'colord'
import namesPlugin from 'colord/plugins/names'
import { useDebouncedCallback } from 'use-debounce'
import { StringEdit, toPathString, type CustomNodeProps } from '@json-edit-react'
import { Loading } from '../_common/Loading'

extend([namesPlugin])

const HsvaColorPicker = lazy(() =>
  import('react-colorful').then((m) => ({ default: m.HsvaColorPicker }))
)

const HsvColorPicker = lazy(() =>
  import('react-colorful').then((m) => ({ default: m.HsvColorPicker }))
)

export interface ColorPickerProps {
  loadingText?: string
  swatchStyles?: React.CSSProperties
  invalidColorError?: string
  /**
   * If true, the color picker will include an alpha channel slider
   * @default false
   */
  alpha?: boolean
  /**
   * If `keepAsColor` is true, if the text input is not a valid color, the
   * component will display an error on submission and not update the value
   * @default true
   */
  keepAsColor?: boolean
}

export const ColorPickerComponent: React.FC<CustomNodeProps<ColorPickerProps>> = ({
  isEditing,
  setIsEditing,
  handleKeyPress,
  value,
  setValue,
  getStyles,
  nodeData,
  originalNode,
  customNodeProps = {},
  onError,
  handleEdit,
  ...props
}) => {
  const {
    loadingText,
    swatchStyles,
    alpha = false,
    keepAsColor = true,
    invalidColorError = 'Invalid Color',
  } = customNodeProps

  const text = value as string

  // The current internal state of the color picker
  const [hsvValue, setHsvValue] = React.useState(colord(text).toHsv())

  const lastValidColor = useRef(text)

  // Debounced setValue to avoid excessive updates while dragging the picker
  const debouncedSetValue = useDebouncedCallback((value: string) => {
    setValue(value)
  }, 150)

  const stringStyle = getStyles('string', nodeData)

  const PickerComponent = alpha ? HsvaColorPicker : HsvColorPicker

  if (typeof text !== 'string') return null

  return (
    <Suspense
      fallback={
        <div style={stringStyle}>
          <Loading text={loadingText} />
        </div>
      }
    >
      {isEditing ? (
        <div style={{ position: 'relative' }}>
          <StringEdit
            styles={getStyles('input', nodeData)}
            pathString={toPathString(nodeData.path)}
            {...props}
            value={text}
            setValue={
              ((value: string) => {
                // Only update the color picker display if the input text is a
                // valid color
                const parsed = colord(value)
                if (parsed.isValid()) {
                  setHsvValue(parsed.toHsv())
                }
                setValue(value)
              }) as React.Dispatch<React.SetStateAction<string>>
            }
            handleEdit={() => {
              if (keepAsColor && !colord(text).isValid()) {
                handleEdit(lastValidColor.current)
                onError({ code: 'UPDATE_ERROR', message: invalidColorError }, text)
                return
              }
              lastValidColor.current = text
              setHsvValue(colord(text).toHsv())
              handleEdit(text)
            }}
          />
          <PickerComponent
            style={{
              position: 'absolute',
              bottom: '1.5em',
              zIndex: 1000,
              boxShadow: 'rgba(0, 0, 0, 0.35) 0px 5px 15px',
              borderRadius: '8px',
            }}
            color={hsvValue}
            onChange={(newColor) => {
              setHsvValue(colord(newColor).toHsv())
              debouncedSetValue(getFormattedColorText(newColor, text))
            }}
            onKeyDown={handleKeyPress}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2em' }}>
          {originalNode}
          {/* Display a color swatch */}
          <div
            style={{
              width: '1em',
              height: '1em',
              backgroundColor: colord(text).toHex(),
              borderRadius: '0.15em',
              ...swatchStyles,
            }}
            onDoubleClick={() => setIsEditing(true)}
          />
        </div>
      )}
    </Suspense>
  )
}

// Set the text value based on the selected color, keeping the
// format the same as the current text input, where possible
const getFormattedColorText = (color: HsvColor | HsvaColor, currentText: string): string => {
  let newValue = ''
  switch (getFormat(currentText)) {
    case 'rgb':
      newValue = colord(color).toRgbString()
      break
    case 'hsl':
      newValue = colord(color).toHslString()
      break
    default:
      newValue = colord(color).toHex()
      break
  }
  return newValue
}
