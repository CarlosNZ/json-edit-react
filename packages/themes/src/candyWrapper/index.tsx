import { type Theme, type ThemeIcons } from 'json-edit-react'

// MingCute icon set (https://github.com/Richard9394/MingCute, Apache-2.0) for
// the Candy Wrapper theme — rounded, friendly outline glyphs that read playful
// without tipping into cheesy. Each glyph is a single `fill="currentColor"`
// path on the standard 24×24 grid, so no svgProps and no viewBox are needed
// (both are core's defaults) and it adopts each `icon*` colour directly.
//
// MingCute's source wraps every icon in `<g fill="none">` with an extra
// invisible registration-mark path; only the real glyph path is inlined here
// (the marker would otherwise inherit the <svg>'s currentColor and show as a
// speck). `fillRule: 'evenodd'` is set per glyph to match the source where its
// counters need it.
const mingcuteIcons: ThemeIcons = {
  // mingcute:add-line
  add: {
    content: (
      <path d="M11 20a1 1 0 1 0 2 0v-7h7a1 1 0 1 0 0-2h-7V4a1 1 0 1 0-2 0v7H4a1 1 0 1 0 0 2h7z" />
    ),
  },
  // mingcute:pencil-line
  edit: {
    content: (
      <path d="M16.035 3.015a3 3 0 0 1 4.099-.135l.144.135l.707.707a3 3 0 0 1 .135 4.098l-.135.144L9.773 19.177a1.5 1.5 0 0 1-.562.354l-.162.047l-4.454 1.028a1 1 0 0 1-1.22-1.088l.02-.113l1.027-4.455a1.5 1.5 0 0 1 .29-.598l.111-.125zm-.707 3.535l-8.99 8.99l-.636 2.758l2.758-.637l8.99-8.99l-2.122-2.12Zm3.536-2.121a1 1 0 0 0-1.32-.083l-.094.083l-.708.707l2.122 2.121l.707-.707a1 1 0 0 0 .083-1.32l-.083-.094z" />
    ),
  },
  // mingcute:delete-2-line
  delete: {
    content: (
      <path d="M14.28 2a2 2 0 0 1 1.897 1.368L16.72 5H20a1 1 0 1 1 0 2l-.003.071l-.867 12.143A3 3 0 0 1 16.138 22H7.862a3 3 0 0 1-2.992-2.786L4.003 7.07L4 7a1 1 0 0 1 0-2h3.28l.543-1.632A2 2 0 0 1 9.721 2zm3.717 5H6.003l.862 12.071a1 1 0 0 0 .997.929h8.276a1 1 0 0 0 .997-.929zM10 10a1 1 0 0 1 .993.883L11 11v5a1 1 0 0 1-1.993.117L9 16v-5a1 1 0 0 1 1-1m4 0a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-5a1 1 0 0 1 1-1m.28-6H9.72l-.333 1h5.226z" />
    ),
  },
  // mingcute:copy-2-line
  copy: {
    content: (
      <path
        fillRule="evenodd"
        d="M9 2a2 2 0 0 0-2 2v2h2V4h11v11h-2v2h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM4 7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zm0 2h11v11H4z"
      />
    ),
  },
  // mingcute:check-line
  ok: {
    content: (
      <path
        fillRule="evenodd"
        d="M21.192 5.465a1 1 0 0 1 0 1.414L9.95 18.122a1.1 1.1 0 0 1-1.556 0l-5.586-5.586a1 1 0 1 1 1.415-1.415l4.95 4.95L19.777 5.465a1 1 0 0 1 1.414 0Z"
      />
    ),
  },
  // mingcute:close-line
  cancel: {
    content: (
      <path
        fillRule="evenodd"
        d="m12 13.414l5.657 5.657a1 1 0 0 0 1.414-1.414L13.414 12l5.657-5.657a1 1 0 0 0-1.414-1.414L12 10.586L6.343 4.929A1 1 0 0 0 4.93 6.343L10.586 12l-5.657 5.657a1 1 0 1 0 1.414 1.414z"
      />
    ),
  },
  // mingcute:down-line — rotated -90deg by core CSS when collapsed. Scaled down
  // a touch so the chevron doesn't crowd the key (core's `.jer-collapse-icon`
  // offset is tuned to the default chevron's footprint).
  collection: {
    content: (
      <path
        fillRule="evenodd"
        d="M12.707 15.707a1 1 0 0 1-1.414 0L5.636 10.05A1 1 0 1 1 7.05 8.636l4.95 4.95l4.95-4.95a1 1 0 0 1 1.414 1.414z"
      />
    ),
    scale: 0.9,
  },
}

export const candyWrapperTheme: Theme = {
  displayName: 'Candy Wrapper',
  fragments: {
    minty: { backgroundColor: '#F1FAEE' },
    pale: { color: '#A8DADC' },
    mid: { color: '#457B9D' },
    dark: { color: '#1D3557' },
    pop: { color: '#E63946' },
    darkBlue: { color: '#2B2D42' },
    translucent: { opacity: 0.8 },
  },
  icons: mingcuteIcons,
  styles: {
    container: 'minty',
    property: 'pop',
    dropZone: '#eb121265',
    bracket: 'dark',
    itemCount: ['pale', { fontWeight: 'bold' }],
    string: 'mid',
    number: ['darkBlue', { fontSize: '85%' }],
    boolean: ['mid', { fontStyle: 'italic', fontWeight: 'bold', fontSize: '80%' }],
    null: { color: '#cccccc', fontWeight: 'bold' },
    input: { border: '1px solid rgb(115, 194, 198)', padding: '0.1em' },
    inputHighlight: '#dffddf',
    iconCollection: 'dark',
    iconEdit: ['mid', 'translucent'],
    iconDelete: ['pop', 'translucent'],
    iconAdd: ['darkBlue', 'translucent'],
    iconCopy: ['dark', 'translucent'],
    iconCancel: 'pop',
  },
}
