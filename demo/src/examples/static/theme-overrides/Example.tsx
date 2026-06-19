import { useState } from 'react'
import { JsonEditor, type ThemeStyles } from '@json-edit-react'
import { useExampleTheme } from '../../kit/exampleProps'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

// Take any base theme and layer your own styling on top. The
// `theme` prop accepts an array: the base theme first, then
// one or more override layers that merge over it (later wins).
//
// Switch the base theme above and watch what *doesn't* move:
// the edit/delete icon colours, the bold-italic booleans, and
// the colour-swatch strings are all pinned by the overrides,
// so they stay put while everything else re-themes.

// A design-tokens document — colours as hex strings, plus a
// handful of flags and numbers.
const initialData = {
  brand: {
    name: 'Aurora UI',
    version: '2.4.0',
    published: true,
  },
  palette: {
    primary: '#6C5CE7',
    secondary: '#00B894',
    info: '#0984E3',
    warning: '#E17055',
    danger: '#D63031',
  },
  typography: {
    fontFamily: 'Inter',
    baseSize: 16,
    lineHeight: 1.5,
    useLigatures: false,
  },
  features: {
    darkMode: true,
    animations: true,
    betaWidgets: false,
  },
}

// Static overrides: plain values applied on top of the base
// theme. Fixed edit/delete icon colours, and every boolean
// rendered bold + italic regardless of the theme behind it.
const overrides: ThemeStyles = {
  iconEdit: '#E17055',
  iconDelete: '#D63031',
  boolean: { fontStyle: 'italic', fontWeight: 'bold' },
}

// A hex-colour matcher for the style function below.
const HEX_COLOUR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

// Style functions: derive CSS from each node at render time,
// applied *after* the static overrides (so they layer on top).
const styleFunctions: ThemeStyles = {
  // Render a hex-colour string in its own colour — a live
  // swatch that ignores the base theme entirely.
  string: ({ value }) =>
    typeof value === 'string' && HEX_COLOUR.test(value)
      ? { color: value, fontWeight: 'bold' }
      : null,
  // Tint booleans green when true, red when false.
  boolean: ({ value }) => ({ color: value ? '#27AE60' : '#C0392B' }),
}

export default function ThemeOverrides() {
  const [data, setData] = useState(initialData)
  const theme = useExampleTheme()

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useExampleProps()} // ---cut---
      rootName="tokens"
      collapse={2}
      // The base theme first, then the static overrides, then
      // the style functions — each layer merges over the last.
      theme={[theme, overrides, styleFunctions]}
    />
  )
}
