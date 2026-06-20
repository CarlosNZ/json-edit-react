import { type ComponentType } from 'react'

// The shell injects no props into example components — they pull what
// they need (editor defaults, toast, …) from `@example-resources`
// themselves. Kept as an explicit empty props type so the `load`
// signatures below read clearly.
export type ExampleComponentProps = Record<string, never>

interface ExampleBase {
  title: string
  blurb: string
  // For examples that mirror a main-demo data set: the data-set key (e.g.
  // `jsonPlaceholder`). The example page's "Go to Demo site" link uses it to
  // deep-link to that data set (`/?data=<key>`); omit it and the link goes to
  // the demo's default view.
  demoDataSet?: string
  // Set `false` to hide the theme picker — for concepts where an injected
  // theme doesn't apply (e.g. editing a theme object itself).
  theme?: false
  // Dev-server scratchpads: `true` strips the entry from the registry in
  // production builds (see registry.ts), so it neither appears in the index
  // nor resolves as a route on the deployed demo.
  devOnly?: boolean
}

// A source string to display, resolving to `{ default: string }`. Static
// examples import their file via `?raw`; live examples import a snippet.
type SourceImport = () => Promise<{ default: string }>

// Rendered live + shown verbatim. The displayed source IS the running file
// (minus any `// ---cut---` scaffolding), so it can't drift from what runs.
export interface StaticExample extends ExampleBase {
  kind: 'static'
  load: () => Promise<{ default: ComponentType<ExampleComponentProps> }>
  code: SourceImport
}

// Editable playground: react-live transpiles the snippet in-browser.
export interface LiveExample extends ExampleBase {
  kind: 'live'
  code: SourceImport
}

// A bespoke interactive page rendered full-width with no source panel — for
// things that aren't copy-paste snippets, e.g. a testing harness.
export interface CustomExample extends ExampleBase {
  kind: 'custom'
  load: () => Promise<{ default: ComponentType<ExampleComponentProps> }>
}

export type ExampleDef = StaticExample | LiveExample | CustomExample
