import React, { createContext, useCallback, useContext, useMemo } from 'react'
import {
  type ThemeableElement,
  type ThemeInput,
  type ThemeIcons,
  type NodeData,
} from '../../types'
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect'
import {
  compileStyles,
  mergeIcons,
  getStyles as resolveStyles,
  writeThemeCssVars,
} from './compileStyles'
import { defaultTheme } from './defaultTheme'

interface ThemeContext {
  getStyles: (element: ThemeableElement, nodeData: NodeData) => React.CSSProperties
  // Always complete — `defaultTheme` defines all seven glyphs and is merge layer 0.
  icons: Required<ThemeIcons>
}
const initialContext: ThemeContext = {
  getStyles: () => ({}),
  icons: mergeIcons(defaultTheme),
}

const ThemeProviderContext = createContext(initialContext)

export const ThemeProvider = ({
  theme = defaultTheme,
  children,
}: {
  theme?: ThemeInput
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
  const icons = useMemo(() => mergeIcons(theme), [theme])

  // The two non-inlineable colours feed static rules in style.css, so they're
  // written to the document root as CSS custom properties whenever the theme
  // changes. Sourcing `document` inside this browser-only effect (rather than
  // receiving it as a prop) lets the editor render its real content during
  // SSR; the two colours then apply once hydrated.
  useIsomorphicLayoutEffect(() => writeThemeCssVars(styles, document.documentElement), [styles])

  const getStyles = useCallback(
    (element: ThemeableElement, nodeData: NodeData) => resolveStyles(styles, element, nodeData),
    [styles]
  )

  const value = useMemo(() => ({ getStyles, icons }), [getStyles, icons])

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>
}

export const useTheme = () => useContext(ThemeProviderContext)
