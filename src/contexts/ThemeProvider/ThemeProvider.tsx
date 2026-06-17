import React, { createContext, useCallback, useContext, useMemo } from 'react'
import {
  type ThemeableElement,
  type ThemeInput,
  type NodeData,
  type IconReplacements,
} from '../../types'
import { compileStyles, getStyles as resolveStyles, getThemeCssVars } from './compileStyles'
import { defaultTheme } from './defaultTheme'

interface ThemeContext {
  getStyles: (element: ThemeableElement, nodeData: NodeData) => React.CSSProperties
  icons: IconReplacements
  // The non-inlineable theme colours as a custom-property fragment, spread onto
  // the editor container by `Editor`.
  cssVars: React.CSSProperties
}
const initialContext: ThemeContext = {
  getStyles: () => ({}),
  icons: {},
  cssVars: {},
}

const ThemeProviderContext = createContext(initialContext)

// Stable default so an omitted `icons` prop doesn't churn the context value.
const EMPTY_ICONS: IconReplacements = {}

export const ThemeProvider = ({
  theme = defaultTheme,
  icons = EMPTY_ICONS,
  children,
}: {
  theme?: ThemeInput
  icons?: IconReplacements
  children: React.ReactNode
}) => {
  // Memoize so the context value is referentially stable across unrelated
  // parent re-renders. Without this, every render handed `useTheme` consumers a
  // fresh `{ getStyles, icons }`, re-rendering every node in the tree (a
  // context update pierces React.memo) — defeating the §16 node memo boundary
  // on every commit.
  // Pass a stable `theme` reference (e.g. memoize an inline theme array) to get
  // the full benefit.
  const styles = useMemo(() => compileStyles(theme), [theme])

  // The two non-inlineable colours feed static rules in style.css. They're
  // surfaced as a custom-property fragment that `Editor` spreads onto the
  // editor container — scoped to this instance, rendered inline (so they're
  // present during SSR, with no post-hydration flash), and reachable inside a
  // shadow root.
  const cssVars = useMemo(() => getThemeCssVars(styles), [styles])

  const getStyles = useCallback(
    (element: ThemeableElement, nodeData: NodeData) => resolveStyles(styles, element, nodeData),
    [styles]
  )

  const value = useMemo(() => ({ getStyles, icons, cssVars }), [getStyles, icons, cssVars])

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>
}

export const useTheme = () => useContext(ThemeProviderContext)
