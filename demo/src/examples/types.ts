import { type ComponentType } from 'react'
import { type CreateToastFnReturn } from '@chakra-ui/react'

// Props the shell injects into a rendered example component. `toast` is Chakra's
// toast fn (from the shell's `useToast`), so an example can surface its event /
// notification stream without wiring up its own toast styling. The shell always
// provides it; examples that don't need it (a plain prop-less component) stay
// assignable, so this is required rather than optional.
export interface ExampleComponentProps {
  toast: CreateToastFnReturn
}

interface ExampleBase {
  title: string
  blurb: string
  // Set `false` to hide the theme picker — for concepts where an injected
  // theme doesn't apply (e.g. editing a theme object itself).
  theme?: false
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
