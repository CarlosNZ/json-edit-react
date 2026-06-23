import { useState } from 'react'
import { JsonEditor, type ThemeIcons } from '@json-edit-react'
import { iconFromSvg } from '@json-edit-react/utils'
import { useEditorDefaults, useEditorTheme } from '@example-resources'

const initialData = {
  string: 'Edit me, copy me, or delete me',
  number: 42,
  boolean: true,
  array: ['one', 'two', 'three'],
  nested: { a: 1, b: 2, c: 3 },
}

// Three ways to author a theme's icon glyphs — each produces an
// `IconDefinition` and core renders + sizes the wrapping <svg>.
const icons: ThemeIcons = {
  // 1. A hand-written IconDefinition: `content` is the inner
  //    SVG markup. With no explicit fill it inherits
  //    `currentColor`, so it follows the theme's iconEdit
  //    colour. (Material Design "edit".)
  edit: {
    content: (
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    ),
  },
  // 2. A React <svg> element through `iconFromSvg`. Two-tone on
  //    purpose: the front page is `currentColor` (themed); the
  //    back page has a fixed amber fill that ignores the theme.
  copy: iconFromSvg(
    <svg viewBox="0 0 24 24">
      <rect x="4" y="4" width="13" height="13" rx="2" fill="#f0a500" />
      <rect x="8" y="8" width="13" height="13" rx="2" fill="currentColor" />
    </svg>
  ),
  // 3. A plain SVG *string* through `iconFromSvg`. A stroke
  //    glyph (Lucide "trash-2"): the root's fill/stroke
  //    attributes become `svgProps`, so `stroke="currentColor"`
  //    themes it.
  delete: iconFromSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`
  ),
}

export default function CustomIcons() {
  const [data, setData] = useState(initialData)
  const theme = useEditorTheme()

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useEditorDefaults()}
      // Override just the theme's `icons` — its colours
      // (iconEdit etc.) still apply via currentColor, so
      // switching theme recolours the glyphs, except the Copy
      // icon's fixed amber back page.
      theme={{ ...theme, icons }}
    />
  )
}
