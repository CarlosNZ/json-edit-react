import { type Theme, type ThemeIcons } from 'json-edit-react'

// Octicons — GitHub's own icon library (https://github.com/primer/octicons,
// MIT) — for the GitHub themes: the actual glyphs GitHub's UI uses, so they're
// elegant and basic by design. The 16px variants are authored on a 16×16 grid
// (hence `viewBox: '0 0 16 16'`); each is a solid `fill="currentColor"` path
// (no svgProps needed) that adopts each theme's `icon*` colour. Both GitHub
// themes share this one set — the palette does the rest.
const octicons: ThemeIcons = {
  // octicon:plus-16
  add: {
    content: (
      <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" />
    ),
    viewBox: '0 0 16 16',
  },
  // octicon:pencil-16
  edit: {
    content: (
      <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z" />
    ),
    viewBox: '0 0 16 16',
  },
  // octicon:trash-16
  delete: {
    content: (
      <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z" />
    ),
    viewBox: '0 0 16 16',
  },
  // octicon:copy-16
  copy: {
    content: (
      <>
        <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" />
        <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
      </>
    ),
    viewBox: '0 0 16 16',
    scale: 0.9,
  },
  // octicon:check-16
  ok: {
    content: (
      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
    ),
    viewBox: '0 0 16 16',
  },
  // octicon:x-16
  cancel: {
    content: (
      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
    ),
    viewBox: '0 0 16 16',
  },
  // octicon:chevron-down-16 — rotated -90deg by core CSS when collapsed. Scaled
  // down a touch so the chevron doesn't crowd the key (core's
  // `.jer-collapse-icon` offset is tuned to the default chevron's footprint).
  collection: {
    content: (
      <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" />
    ),
    viewBox: '0 0 16 16',
    // scale: 0.9,
  },
}

export const githubDarkTheme: Theme = {
  displayName: 'Github Dark',
  fragments: { purple: '#D2A8FF', skyBlue: '#A5D6FF', lime: '#56d364', orange: 'rgb(203, 75, 22)' },
  icons: octicons,
  styles: {
    container: { backgroundColor: '#0d1117', color: 'white' },
    dropZone: 'rgba(165, 214, 255, 0.47)',
    property: '#E6EDF3',
    bracket: 'lime',
    itemCount: '#8B949E',
    string: 'skyBlue',
    number: 'purple',
    boolean: { color: '#FF7B72', fontSize: '90%', fontWeight: 'bold' },
    null: [
      'green',
      {
        backgroundColor: 'rgba(255, 255, 255, 0.14)',
        padding: '0.05em 0.2em',
        borderRadius: '0.3em',
      },
    ],
    iconCollection: 'purple',
    iconEdit: 'purple',
    iconDelete: 'orange',
    iconAdd: 'orange',
    iconCopy: 'skyBlue',
    iconOk: 'lime',
    iconCancel: 'orange',
  },
}

export const githubLightTheme: Theme = {
  displayName: 'Github Light',
  fragments: { purple: '#8250DF' },
  icons: octicons,
  styles: {
    container: 'white',
    property: '#1F2328',
    bracket: '#00802e',
    itemCount: '#8B949E',
    string: '#0A3069',
    number: '#953800',
    boolean: { color: '#CF222E', fontSize: '90%', fontWeight: 'bold' },
    null: [
      '#FF7B72',
      {
        backgroundColor: 'rgba(233, 38, 38, 0.14)',
        padding: '0.05em 0.2em',
        borderRadius: '0.3em',
      },
    ],
    iconCollection: 'purple',
    iconEdit: 'purple',
    iconDelete: 'rgb(203, 75, 22)',
    iconAdd: 'purple',
    iconCopy: '#57606A',
  },
}
