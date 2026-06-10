import { type StylesConfig } from 'react-select'
import { type ThemePalette } from '../../kit/useThemePalette'

// Lighten an `rgb()`/`rgba()` color toward white by blending each channel.
// Returns the input unchanged if it can't be parsed.
export const lighten = (color: string | undefined, factor = 0.1): string | undefined => {
  if (!color) return undefined
  const m = color.match(/rgba?\(([^)]+)\)/)
  if (!m) return color
  const [r, g, b, a] = m[1].split(',').map((s) => parseFloat(s))
  const blend = (n: number) => Math.round(n + (255 - n) * factor)
  return Number.isFinite(a)
    ? `rgba(${blend(r)}, ${blend(g)}, ${blend(b)}, ${a})`
    : `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`
}

// Re-emit an `rgb()`/`rgba()` color with a forced alpha. Returns undefined
// for unparseable / missing input.
export const withAlpha = (color: string | undefined, alpha: number): string | undefined => {
  if (!color) return undefined
  const m = color.match(/rgba?\(([^)]+)\)/)
  if (!m) return undefined
  const [r, g, b] = m[1].split(',').map((s) => parseFloat(s))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Compact the react-select control to roughly the native <select>'s footprint
// and tint the dropdown menu from the active JsonEditor theme. The control's
// own text stays default-coloured (matches the surrounding input UI); only the
// menu surface, option text, and focused-option highlight are pulled from the
// palette.
export const buildSelectStyles = (
  palette: ThemePalette
): StylesConfig<{ value: string; label: string }, false> => ({
  control: (base) => ({
    ...base,
    minHeight: 0,
    fontSize: '0.95em',
    lineHeight: 1.1,
  }),
  valueContainer: (base) => ({ ...base, padding: '0 0.5em' }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base) => ({ ...base, padding: '0 0.25em' }),
  menu: (base) => ({
    ...base,
    backgroundColor: lighten(palette.headerBg.backgroundColor) ?? base.backgroundColor,
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25)',
    fontSize: '0.85em',
  }),
  option: (base, state) => ({
    ...base,
    color: palette.string ?? base.color,
    backgroundColor: state.isFocused
      ? (withAlpha(palette.property, 0.25) ?? base.backgroundColor)
      : 'transparent',
  }),
})
