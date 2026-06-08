import { type ComponentType } from 'react'

interface ExampleBase {
  title: string
  blurb: string
  // Set `false` to hide the theme picker — for concepts where an injected theme
  // doesn't apply (e.g. editing a theme object itself).
  theme?: false
  // The source string to display. Static examples import their own file via
  // `?raw`; live examples import the editable snippet from a `code.ts`. Both
  // resolve to `{ default: string }`.
  code: () => Promise<{ default: string }>
}

// Rendered live + shown verbatim. The displayed source IS the running file (minus
// any `// ---cut---` scaffolding), so it can't drift from what executes.
export interface StaticExample extends ExampleBase {
  kind: 'static'
  load: () => Promise<{ default: ComponentType }>
}

// Editable playground: react-live transpiles the snippet in-browser.
export interface LiveExample extends ExampleBase {
  kind: 'live'
}

export type ExampleDef = StaticExample | LiveExample
