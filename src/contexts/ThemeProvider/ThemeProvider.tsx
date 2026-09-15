import React, { createContext, useCallback, useContext, useMemo } from 'react'
import { type ThemeableElement, type ThemeInput, type ThemeIcons, type NodeData } from '../../types'
import {
  compileStyles,
  mergeIcons,
  getStyles as resolveStyles,
  getThemeCssVars,
} from './compileStyles'
import { defaultTheme } from './defaultTheme'

interface ThemeContext {
  getStyles: (element: ThemeableElement, nodeData: NodeData) => React.CSSProperties
  // Always complete: `defaultTheme` defines all seven glyphs and is merge
  // layer 0.
  icons: Required<ThemeIcons>
  // The non-inlineable theme colours as a custom-property fragment, spread onto
  // the editor container by `Editor`.
  cssVars: React.CSSProperties
}
const initialContext: ThemeContext = {
  getStyles: () => ({}),
  icons: mergeIcons(defaultTheme),
  cssVars: {},
}

const ThemeProviderContext = createContext(initialContext)

export const ThemeProvider = ({
  theme = defaultTheme,
  children,
}: {
  theme?: ThemeInput
  children: React.ReactNode
}) => {
  // Memoised so the context value is referentially stable across unrelated
  // parent re-renders: a fresh `{ getStyles, icons }` would re-render every
  // node in the tree, since a context update pierces `React.memo`. Pass a
  // stable `theme` reference (memoise an inline theme array) for the full
  // benefit.
  const styles = useMemo(() => compileStyles(theme), [theme])
  const icons = useMemo(() => mergeIcons(theme), [theme])

  // The two non-inlineable colours feed static rules in style.css, surfaced as
  // a custom-property fragment that `Editor` spreads onto the editor container:
  // scoped to this instance, rendered inline (so they survive SSR with no
  // post-hydration flash), and reachable inside a shadow root.
  const cssVars = useMemo(() => getThemeCssVars(styles), [styles])

  const getStyles = useCallback(
    (element: ThemeableElement, nodeData: NodeData) => resolveStyles(styles, element, nodeData),
    [styles]
  )

  const value = useMemo(() => ({ getStyles, icons, cssVars }), [getStyles, icons, cssVars])

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>
}

export const useTheme = () => useContext(ThemeProviderContext)
