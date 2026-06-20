// `@example-resources` — the single, clearly-named source for the
// scaffolding the example shell provides. Examples import from here
// *visibly* (no hidden `// ---cut---` lines), so the shown source is
// honest about what the harness injects.
//
// The rule: anything tied to render-time React state (the
// picker-selected theme, a toast) is a hook; only truly static things
// (types, pure helpers) are plain exports.

import { useToast } from '@chakra-ui/react'

// The editor props the shell controls — theme (from the picker),
// className, sizing, counts. A hook, not a constant: the theme is
// chosen at runtime and delivered through context, so a frozen object
// couldn't reflect it. Spread it into every example's <JsonEditor>.
export { useExampleProps as useEditorDefaults } from './exampleProps'

// Chakra's toast fn (the demo's notifier). Examples call it as
// `const toast = useToast()` and fire it from their handlers —
// importing it from here keeps the example source free of a direct
// Chakra import.
export { useToast }

// The notifier's type (Chakra's `useToast()` return), for helpers that
// take `toast` as a parameter.
export type Toast = ReturnType<typeof useToast>

// The colour categories a toast can use — a subset of Chakra's
// statuses, so it's assignable wherever a status is expected.
export type ToastStatus = 'info' | 'success' | 'warning' | 'error'
