// Tokyo Night colour scheme by enkia (MIT),
// https://github.com/enkia/tokyo-night-vscode-theme. Adapted as a
// json-edit-react theme; all credit to the original author.

import { type Theme, type ThemeIcons } from 'json-edit-react'

// Phosphor Light set (https://phosphoricons.com/) for the Tokyo Night theme — a
// fine, light-stroke look to suit its cool, muted palette. (Dracula carries the
// chunky Phosphor Duotone weight, so the two themes sit at opposite ends of one
// family.) Light glyphs are solid `fill="currentColor"` paths that *draw* a
// ~6-unit stroke rather than being stroked, so they need no svgProps and adopt
// each `icon*` colour directly. Source viewBox is 256×256.
const phosphorLightIcons: ThemeIcons = {
  // ph:plus-light
  add: {
    content: (
      <path d="M222,128a6,6,0,0,1-6,6H134v82a6,6,0,0,1-12,0V134H40a6,6,0,0,1,0-12h82V40a6,6,0,0,1,12,0v82h82A6,6,0,0,1,222,128Z" />
    ),
    viewBox: '0 0 256 256',
    scale: 0.9,
  },
  // ph:pencil-simple-light
  edit: {
    content: (
      <path d="M225.9,74.78,181.21,30.09a14,14,0,0,0-19.8,0L38.1,153.41a13.94,13.94,0,0,0-4.1,9.9V208a14,14,0,0,0,14,14H92.69a13.94,13.94,0,0,0,9.9-4.1L225.9,94.58a14,14,0,0,0,0-19.8ZM94.1,209.41a2,2,0,0,1-1.41.59H48a2,2,0,0,1-2-2V163.31a2,2,0,0,1,.59-1.41L136,72.48,183.51,120ZM217.41,86.1,192,111.51,144.49,64,169.9,38.58a2,2,0,0,1,2.83,0l44.68,44.69a2,2,0,0,1,0,2.83Z" />
    ),
    viewBox: '0 0 256 256',
    scale: 0.9,
  },
  // ph:trash-simple-light
  delete: {
    content: (
      <path d="M216,50H40a6,6,0,0,0,0,12H50V208a14,14,0,0,0,14,14H192a14,14,0,0,0,14-14V62h10a6,6,0,0,0,0-12ZM194,208a2,2,0,0,1-2,2H64a2,2,0,0,1-2-2V62H194ZM82,24a6,6,0,0,1,6-6h80a6,6,0,0,1,0,12H88A6,6,0,0,1,82,24Z" />
    ),
    viewBox: '0 0 256 256',
    scale: 0.9,
  },
  // ph:copy-light
  copy: {
    content: (
      <path d="M216,34H88a6,6,0,0,0-6,6V82H40a6,6,0,0,0-6,6V216a6,6,0,0,0,6,6H168a6,6,0,0,0,6-6V174h42a6,6,0,0,0,6-6V40A6,6,0,0,0,216,34ZM162,210H46V94H162Zm48-48H174V88a6,6,0,0,0-6-6H94V46H210Z" />
    ),
    viewBox: '0 0 256 256',
    scale: 0.9,
  },
  // ph:check-light
  ok: {
    content: (
      <path d="M228.24,76.24l-128,128a6,6,0,0,1-8.48,0l-56-56a6,6,0,0,1,8.48-8.48L96,191.51,219.76,67.76a6,6,0,0,1,8.48,8.48Z" />
    ),
    viewBox: '0 0 256 256',
  },
  // ph:x-light
  cancel: {
    content: (
      <path d="M204.24,195.76a6,6,0,1,1-8.48,8.48L128,136.49,60.24,204.24a6,6,0,0,1-8.48-8.48L119.51,128,51.76,60.24a6,6,0,0,1,8.48-8.48L128,119.51l67.76-67.75a6,6,0,0,1,8.48,8.48L136.49,128Z" />
    ),
    viewBox: '0 0 256 256',
  },
  // ph:caret-down-light — rotated -90deg by core CSS when collapsed. Scaled down
  // a touch so the wide chevron doesn't crowd the key (core's
  // `.jer-collapse-icon` offset is tuned to the default chevron's footprint).
  collection: {
    content: (
      <path d="M212.24,100.24l-80,80a6,6,0,0,1-8.48,0l-80-80a6,6,0,0,1,8.48-8.48L128,167.51l75.76-75.75a6,6,0,0,1,8.48,8.48Z" />
    ),
    viewBox: '0 0 256 256',
    scale: 0.9,
  },
}

export const tokyoNightTheme: Theme = {
  displayName: 'Tokyo Night',
  fragments: { purple: '#bb9af7', pink: '#f7768e', green: '#9ece6a' },
  icons: phosphorLightIcons,
  styles: {
    container: { color: '#a9b1d6', backgroundColor: '#1a1b26' },
    dropZone: '#c0caf59c',
    property: '#c0caf5',
    bracket: '#7aa2f7',
    itemCount: ['#565f89', { fontStyle: 'normal', fontSize: '95%' }],
    string: [
      'green',
      { fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: '95%' },
    ],
    number: { color: '#ff9e64', fontSize: '95%' },
    boolean: ['pink', { fontWeight: 'bold', fontSize: '90%' }],
    null: { color: '#565f89', fontWeight: 'bold' },
    input: { border: '1px solid #565f89' },
    inputHighlight: '#dee0f6',
    iconCollection: 'purple',
    iconEdit: 'purple',
    iconDelete: 'pink',
    iconAdd: 'green',
    iconCopy: '#7dcfff',
    iconOk: 'green',
    iconCancel: 'pink',
  },
}
