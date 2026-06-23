// Solarized colour scheme by Ethan Schoonover (MIT),
// https://ethanschoonover.com/solarized. Adapted as json-edit-react themes;
// all credit to the original author.

import { type SVGProps } from 'react'
import { type Theme, type ThemeIcons } from 'json-edit-react'

// Shared stroke attributes for all Lucide glyphs. Set at the <svg> level so
// individual path elements stay clean.
const lucideSvgProps: SVGProps<SVGSVGElement> = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

// Lucide icon set (https://lucide.dev/) for the Solarized themes. All glyphs
// are stroke-based — colour flows from each theme's `icon*` styles via
// currentColor. Both themes share this definition; the palette does the rest.
const lucideIcons: ThemeIcons = {
  // lucide:plus
  add: {
    content: (
      <>
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </>
    ),
    svgProps: lucideSvgProps,
    scale: 0.9,
  },
  // lucide:pencil
  edit: {
    content: (
      <>
        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
        <path d="m15 5 4 4" />
      </>
    ),
    svgProps: lucideSvgProps,
    scale: 0.9,
  },
  // lucide:trash-2
  delete: {
    content: (
      <>
        <path d="M3 6h18" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </>
    ),
    svgProps: lucideSvgProps,
    scale: 0.9,
  },
  // lucide:copy
  copy: {
    content: (
      <>
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
      </>
    ),
    svgProps: lucideSvgProps,
    scale: 0.9,
  },
  // lucide:check
  ok: {
    content: <path d="M20 6 9 17l-5-5" />,
    svgProps: lucideSvgProps,
  },
  // lucide:x
  cancel: {
    content: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
    svgProps: lucideSvgProps,
  },
  // lucide:chevron-down — rotated -90deg by core CSS when collapsed (→ right).
  // The chevron is centred at (12,12) but only fills the middle of the stock
  // 24×24 box, so it reads small. A tighter, still-centred viewBox zooms in
  // without growing the <svg> box (which `scale` would, spilling over the key).
  // 4 4 16 16 keeps the path + its round caps (x 5→19, y 8→16) clear of the
  // frame and brings the chevron up to the action glyphs' visual width.
  collection: {
    content: <path d="m6 9 6 6 6-6" />,
    svgProps: lucideSvgProps,
    viewBox: '4 4 16 16',
    scale: 0.7,
  },
}

export const solarizedDarkTheme: Theme = {
  displayName: 'Solarized Dark',
  fragments: { green: '#859900', red: '#dc322f', blue: '#268bd2' },
  icons: lucideIcons,
  styles: {
    container: { color: '#839496', backgroundColor: '#002b36' },
    dropZone: 'rgba(38, 139, 210, 0.15)',
    property: { fontWeight: 'bold', color: '#93a1a1' },
    bracket: 'green',
    itemCount: '#586e75',
    string: '#2aa198',
    number: { color: '#d33682', fontSize: '95%' },
    boolean: { color: '#cb4b16', fontWeight: 'bold', fontSize: '90%' },
    null: ['red', { fontWeight: 'bold' }],
    input: { border: '1px solid #586e75' },
    inputHighlight: '#a6e1f0',
    iconCollection: 'blue',
    iconEdit: 'blue',
    iconDelete: 'red',
    iconAdd: 'green',
    iconCopy: '#6c71c4',
    iconOk: 'green',
    iconCancel: 'red',
  },
}

export const solarizedLightTheme: Theme = {
  displayName: 'Solarized Light',
  fragments: { green: '#859900', red: '#dc322f', blue: '#268bd2' },
  icons: lucideIcons,
  styles: {
    container: { color: '#657b83', backgroundColor: '#fdf6e3' },
    dropZone: 'rgba(38, 139, 210, 0.15)',
    property: ['#586e75', { fontWeight: 'bold' }],
    bracket: 'green',
    itemCount: '#93a1a1',
    string: '#2aa198',
    number: { color: '#d33682', fontSize: '95%' },
    boolean: { color: '#cb4b16', fontWeight: 'bold', fontSize: '90%' },
    null: ['red'],
    input: { border: '1px solid #93a1a1' },
    inputHighlight: '#a6e1f0',
    iconCollection: 'blue',
    iconEdit: 'blue',
    iconDelete: 'red',
    iconAdd: 'green',
    iconCopy: '#6c71c4',
    iconOk: 'green',
    iconCancel: 'red',
  },
}
