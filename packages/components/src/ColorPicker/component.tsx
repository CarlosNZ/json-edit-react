/**
 * A Colour picker Custom Component
 *
 * Can handle named colours, Hex, RGB and HSL formats, with an optional alpha
 * channel
 */

import React, { lazy, Suspense } from 'react'
import { HsvColor } from 'react-colorful'
import { colord, extend, getFormat, HsvaColor } from 'colord'
import namesPlugin from 'colord/plugins/names'
import { useDebouncedCallback } from 'use-debounce'
import { StringEdit, toPathString, type CustomComponentProps } from 'json-edit-react'
import { Loading } from '../_common/Loading'
import { finiteHsv } from './colorUtils'

// colord parses named colours ('red', 'rebeccapurple', …) only once its
// `names` plugin is registered via `extend`. Register it lazily on first use
// rather than at module top level: a top-level `extend(...)` is a real side
// effect, which both violates the package's `sideEffects: false` (a bundler
// trusting that flag could drop the call and silently break named-colour
// parsing) and keeps colord in the bundle of anyone importing a sibling
// component. `extend` is idempotent; the flag just skips the repeat call.
let namesPluginRegistered = false
const ensureColordPlugins = () => {
  if (namesPluginRegistered) return
  extend([namesPlugin])
  namesPluginRegistered = true
}

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

export const ColorPickerComponent: React.FC<CustomComponentProps<ColorPickerProps>> = ({
  isEditing,
  setIsEditing,
  onKeyDown,
  value,
  setValue,
  getStyles,
  nodeData,
  originalNode,
  componentProps = {},
  handleEdit,
  ...props
}) => {
  // Register colord's named-colour plugin before the first colord() call below
  ensureColordPlugins()

  const { loadingText, swatchStyles, alpha = false } = componentProps

  const text = value as string

  // The picker's current colour. react-colorful is self-controlled: it caches
  // the colour it last emitted and compares the incoming `color` prop to it
  // with `===`. We keep this in sync so external edits (typing) drive the
  // picker, and so the picker's own changes feed straight back without churn —
  // see the `onChange` note below.
  const [hsvValue, setHsvValue] = React.useState<HsvaColor>(colord(text).toHsv())

  // Debounced setValue to avoid excessive updates while dragging the picker
  const debouncedSetValue = useDebouncedCallback((value: string) => setValue(value), 150)

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
              ((newText: string) => {
                // Drive the picker only from external (typed) edits. The
                // picker's own changes never re-enter here: a controlled
                // textarea doesn't fire onChange when its `value` prop is set
                // programmatically.
                const parsed = colord(newText)
                if (parsed.isValid()) setHsvValue(parsed.toHsv())
                setValue(newText)
              }) as React.Dispatch<React.SetStateAction<string>>
            }
            // Every confirm path funnels through core's no-arg `handleEdit`;
            // the definition's `fromStandardType` enforces `keepAsColor` (or
            // rejects, keeping the session open with the invalid text).
            handleEdit={handleEdit}
          />
          <PickerComponent
            style={{
              position: 'absolute',
              bottom: '1.5em',
              zIndex: 1000,
              boxShadow: 'rgba(0, 0, 0, 0.35) 0px 5px 15px',
              borderRadius: '8px',
            }}
            color={finiteHsv(hsvValue)}
            onChange={(newColor) => {
              // Echo the picker's own output straight back into `color`.
              // Re-deriving it through colord re-rounds it and re-adds the `a`
              // key the non-alpha picker strips, so react-colorful's `===`
              // cache check fails every time and forces a redundant re-sync
              // (and colord collapses the hue at the grey axis, yanking the
              // slider). Feeding the raw object back keeps reference identity,
              // so the check short-circuits. colord stays only for the
              // text-format conversion below.
              setHsvValue(newColor as HsvaColor)
              debouncedSetValue(getFormattedColorText(newColor, text))
            }}
            onKeyDown={onKeyDown}
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
