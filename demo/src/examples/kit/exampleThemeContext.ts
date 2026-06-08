import { createContext, useContext } from 'react'
import { defaultTheme, type Theme } from '@json-edit-react'

// Demo-side context that carries the theme chosen in the example shell's picker.
// Example bodies read it via `useExampleTheme()` and pass it to their `JsonEditor`
// — there's no public ambient-theme provider in core, so the `theme` prop is the
// only way in. Defaults to `defaultTheme` so example files still run standalone.
export const ExampleThemeContext = createContext<Theme>(defaultTheme)

export const useExampleTheme = (): Theme => useContext(ExampleThemeContext)
