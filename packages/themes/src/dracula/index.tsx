import { type Theme, type ThemeIcons } from 'json-edit-react'

// Phosphor Duotone icon set (https://phosphoricons.com/) for the Dracula theme.
// Each glyph is two layers: a faint, reduced-opacity fill behind a solid
// foreground. Both inherit `fill="currentColor"` (core's IconSvg defaults the
// <svg> fill), so the whole two-tone glyph takes on each theme `icon*` colour —
// no second colour is hardcoded, the duotone effect rides on the opacity alone.
// Source viewBox is 256×256; no svgProps needed (fill defaults to currentColor).
//
// Secondary-layer opacities. The action glyphs (edit toolbar) are outline-style
// with small faint regions that wash out against Dracula's dark background, so
// they take a stronger tint to keep the duotone legible. The circle/caret
// glyphs have a large faint fill, so Phosphor's canonical 0.2 reads fine there.
const strongFill = 0.4
const softFill = 0.2

const phosphorDuotoneIcons: ThemeIcons = {
  // ph:plus-square-duotone
  add: {
    content: (
      <>
        <path
          d="M216,48V208a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H208A8,8,0,0,1,216,48Z"
          opacity={softFill}
        />
        <path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V48H208V208Zm-32-80a8,8,0,0,1-8,8H136v32a8,8,0,0,1-16,0V136H88a8,8,0,0,1,0-16h32V88a8,8,0,0,1,16,0v32h32A8,8,0,0,1,176,128Z" />
      </>
    ),
    viewBox: '0 0 256 256',
  },
  // ph:pencil-simple-duotone
  edit: {
    content: (
      <>
        <path
          d="M221.66,90.34,192,120,136,64l29.66-29.66a8,8,0,0,1,11.31,0L221.66,79A8,8,0,0,1,221.66,90.34Z"
          opacity={strongFill}
        />
        <path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z" />
      </>
    ),
    viewBox: '0 0 256 256',
  },
  // ph:trash-duotone
  delete: {
    content: (
      <>
        <path d="M200,56V208a8,8,0,0,1-8,8H64a8,8,0,0,1-8-8V56Z" opacity={strongFill} />
        <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z" />
      </>
    ),
    viewBox: '0 0 256 256',
  },
  // ph:copy-simple-duotone
  copy: {
    content: (
      <>
        <path d="M184,72V216H40V72Z" opacity={softFill} />
        <path d="M184,64H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H184a8,8,0,0,0,8-8V72A8,8,0,0,0,184,64Zm-8,144H48V80H176ZM224,40V184a8,8,0,0,1-16,0V48H72a8,8,0,0,1,0-16H216A8,8,0,0,1,224,40Z" />
      </>
    ),
    viewBox: '0 0 256 256',
  },
  // ph:check-circle-duotone
  ok: {
    content: (
      <>
        <path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity={softFill} />
        <path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z" />
      </>
    ),
    viewBox: '0 0 256 256',
    scale: 1.1,
  },
  // ph:x-circle-duotone
  cancel: {
    content: (
      <>
        <path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity={softFill} />
        <path d="M165.66,101.66,139.31,128l26.35,26.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z" />
      </>
    ),
    viewBox: '0 0 256 256',
    scale: 1.1,
  },
  // ph:caret-down-duotone — rotated -90deg by core CSS when collapsed (→ right).
  // The caret fills its box wider than core's default chevron, so at full size
  // it crowds the key — the `.jer-collapse-icon` left offset is tuned to the
  // default glyph's footprint. A small scale-down is the rotation-safe,
  // theme-local lever that buys back the gap, trading a hair of size.
  collection: {
    content: (
      <>
        <path d="M208,96l-80,80L48,96Z" opacity={softFill} />
        <path d="M215.39,92.94A8,8,0,0,0,208,88H48a8,8,0,0,0-5.66,13.66l80,80a8,8,0,0,0,11.32,0l80-80A8,8,0,0,0,215.39,92.94ZM128,164.69,67.31,104H188.69Z" />
      </>
    ),
    viewBox: '0 0 256 256',
    scale: 0.9,
  },
}

export const draculaTheme: Theme = {
  displayName: 'Dracula',
  fragments: { cyan: '#8be9fd', red: '#ff5555', green: '#50fa7b' },
  icons: phosphorDuotoneIcons,
  styles: {
    container: {
      color: '#f8f8f2',
      backgroundColor: '#282a36',
    },
    dropZone: 'rgba(139, 233, 253, 0.15)',
    property: '#f8f8f2',
    bracket: 'green',
    itemCount: '#6272a4',
    string: '#f1fa8c',
    number: { color: '#bd93f9', fontSize: '105%' },
    boolean: { color: '#ff79c6', fontWeight: 'bold', fontSize: '90%' },
    null: ['red', { fontWeight: 'bold' }],
    input: { border: '1px solid #6272a4' },
    inputHighlight: '#d2d8ff',
    iconCollection: 'cyan',
    iconEdit: 'cyan',
    iconDelete: 'red',
    iconAdd: 'green',
    iconCopy: '#ffb86c',
    iconOk: 'green',
    iconCancel: 'red',
  },
}
