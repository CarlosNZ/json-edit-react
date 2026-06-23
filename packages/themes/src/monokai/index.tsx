// Palette inspired by the original Monokai colour scheme by Wimer Hazenberg.
// All credit for the colours to the author; no affiliation with Monokai Pro.

import { type Theme, type ThemeIcons } from 'json-edit-react'

// Pixelarticons set (https://pixelarticons.com/, MIT) for the Monokai theme — a
// chunky 8-bit / old-school look to pair with its monospace container font.
// Every glyph is solid `fill="currentColor"` on the standard 24×24 grid with no
// strokes, so they need no svgProps and no viewBox (both are core's defaults)
// and adopt each `icon*` colour directly. The blocky, stair-stepped forms read
// as pixel art even when the grid is scaled off integer pixels.
const pixelIcons: ThemeIcons = {
  // pixelarticons:plus
  add: { content: <path d="M13 11h7v2h-7v7h-2v-7H4v-2h7V4h2v7Z" /> },
  // pixelarticons:pen-square
  edit: {
    content: (
      <path d="M5 3h6v2H5zM3 5h2v14H3zm16 8h2v6h-2zM5 19h14v2H5zm3-9h2v6H8zm2 4h4v2h-4zm0-6h2v2h-2zm2-2h2v2h-2zm2-2h2v2h-2zm2-2h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2zm-2 2h2v2h-2zm-2 2h2v2h-2zm-2 2h2v2h-2zm-4 0h2v2h-2z" />
    ),
  },
  // pixelarticons:trash
  delete: {
    content: (
      <path d="M18 22H6V20H18V22ZM9 6H15V4H17V6H22V8H20V20H18V8H6V20H4V8H2V6H7V4H9V6ZM15 4H9V2H15V4Z" />
    ),
  },
  // pixelarticons:copy
  copy: {
    content: (
      <path d="M8 6h12v2H8zM4 2h12v2H4zm2 6h2v12H6zM2 4h2v12H2zm6 16h12v2H8zM20 8h2v12h-2zm-4-4h2v2h-2zM4 16h2v2H4z" />
    ),
  },
  // pixelarticons:check
  ok: {
    content: (
      <path d="M10 18H8v-2h2v2Zm-2-2H6v-2h2v2Zm4-2v2h-2v-2h2Zm-6 0H4v-2h2v2Zm8 0h-2v-2h2v2Zm2-2h-2v-2h2v2Zm2-2h-2V8h2v2Zm2-2h-2V6h2v2Z" />
    ),
  },
  // pixelarticons:close
  cancel: {
    content: (
      <path d="M7 19H5V17H7V19ZM19 19H17V17H19V19ZM9 15V17H7V15H9ZM17 17H15V15H17V17ZM11 15H9V13H11V15ZM15 15H13V13H15V15ZM13 13H11V11H13V13ZM11 11H9V9H11V11ZM15 11H13V9H15V11ZM9 9H7V7H9V9ZM17 9H15V7H17V9ZM7 7H5V5H7V7ZM19 7H17V5H19V7Z" />
    ),
  },
  // pixelarticons:chevron-down — rotated -90deg by core CSS when collapsed.
  // Scaled down a touch: the glyph fills its box wide enough to crowd the key
  // at full size (core's `.jer-collapse-icon` offset is tuned to the default
  // chevron's footprint). See the Dracula caret for the same adjustment.
  collection: {
    content: (
      <path d="M13 16h-2v-2h2v2Zm-2-2H9v-2h2v2Zm4 0h-2v-2h2v2Zm-6-2H7v-2h2v2Zm8 0h-2v-2h2v2ZM7 10H5V8h2v2Zm12 0h-2V8h2v2Z" />
    ),
    scale: 0.9,
  },
}

export const monokaiTheme: Theme = {
  displayName: 'Monokai',
  fragments: { green: '#a6e22e', pink: '#f92672', cyan: '#66d9ef', orange: '#fd971f' },
  icons: pixelIcons,
  styles: {
    container: {
      color: '#f8f8f2',
      backgroundColor: '#272822',
      fontFamily: "Monaco, Consolas, 'DejaVu Sans Mono', monospace",
    },
    dropZone: '#e6db749f',
    property: 'green',
    bracket: '#f8f8f2',
    itemCount: [
      '#75715e',
      { fontStyle: 'normal', fontWeight: 'bold', letterSpacing: '1px', fontSize: '90%' },
    ],
    string: '#e6db74',
    number: { color: '#ae81ff', fontSize: '95%' },
    boolean: ['orange', { fontWeight: 'bold', fontSize: '90%' }],
    null: ['pink', { fontWeight: 'bold' }],
    input: { border: '1px solid #75715e' },
    inputHighlight: '#e8f2b8',
    iconCollection: 'cyan',
    iconEdit: 'cyan',
    iconDelete: 'pink',
    iconAdd: 'green',
    iconCopy: 'orange',
    iconOk: 'green',
    iconCancel: 'pink',
  },
}
