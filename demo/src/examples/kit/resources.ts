// `@example-resources` — the single, clearly-named source for the
// scaffolding the example shell provides. Examples import from here
// *visibly* (no hidden `// ---cut---` lines), so the shown source is
// honest about what the harness injects.
//
// The rule: anything tied to render-time React state (the
// picker-selected theme, a toast) is a hook; only truly static things
// (types, pure helpers) are plain exports.

import { useCallback } from 'react'
import { useToast } from '@chakra-ui/react'
import { type OnCopyFunction } from '@json-edit-react'
import { truncate } from '../../helpers'
import { useExampleProps } from './exampleProps'

// The editor defaults every example spreads into its <JsonEditor> /
// <JsonViewer>: the shell-controlled presentation (theme from the
// picker, className, sizing, counts) plus a shared `onCopy` that
// toasts the copied value or path — mirroring the main demo. A hook,
// not a constant, because the theme arrives via context and `onCopy`
// needs the toast fn, both at render time.
export const useEditorDefaults = () => {
  const props = useExampleProps()
  const toast = useToast()
  const onCopy = useCallback<OnCopyFunction>(
    ({ stringValue, type, success, error }) =>
      success
        ? toast({
            title: `${type === 'value' ? 'Value' : 'Path'} copied to clipboard:`,
            description: truncate(String(stringValue)),
            status: 'success',
            duration: 5000,
            isClosable: true,
          })
        : toast({
            title: 'Problem copying to clipboard',
            description: error?.message,
            status: 'error',
            duration: 5000,
            isClosable: true,
          }),
    [toast]
  )
  return { ...props, onCopy }
}

// The resolved base Theme (the picker's current choice), for examples
// that compose their own styles on top of it.
export { useExampleTheme as useEditorTheme } from './exampleProps'

// A palette derived from the active theme (accent / edit colours), for
// examples that need theme-matched colours of their own.
export { useExamplePalette as useEditorPalette } from './useThemePalette'
export type { ThemePalette } from './useThemePalette'

// A search box several examples render above the editor — re-exported
// so they pull it from the one place, not a deep `../../kit/` path.
export { SearchBox } from './SearchBox'

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
