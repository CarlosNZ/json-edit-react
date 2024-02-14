import React, { createContext, useContext, useState } from 'react'
import {
  themes,
  emptyStyleObject,
  type Theme,
  type ThemeableElement,
  type ThemeStyles,
  type ThemeInput,
  type CompiledStyles,
  type ThemeValue,
  type ThemeFunction,
} from './themes'
import { type NodeData, type IconReplacements } from '../types'

const defaultTheme = themes.default

interface ThemeContext {
  // styles: CompiledStyles
  getStyles: (element: ThemeableElement, nodeData: NodeData) => React.CSSProperties
  setTheme: (theme: ThemeInput) => void
  icons: IconReplacements
  setIcons: React.Dispatch<React.SetStateAction<IconReplacements>>
}
const initialContext: ThemeContext = {
  // styles: emptyStyleObject,
  getStyles: () => ({}),
  setTheme: (_: ThemeInput) => {},
  icons: {},
  setIcons: () => {},
}

const ThemeProviderContext = createContext(initialContext)

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [styles, setStyles] = useState<CompiledStyles>(emptyStyleObject)
  const [icons, setIcons] = useState<IconReplacements>({})

  const setTheme = (theme: ThemeInput) => setStyles(compileStyles(theme))

  const getStyles = (element: ThemeableElement, nodeData: NodeData) => {
    if (typeof styles[element] === 'function') {
      return (styles[element] as ThemeFunction)(nodeData) as React.CSSProperties
    }

    return styles[element] as React.CSSProperties
  }

  return (
    <ThemeProviderContext.Provider value={{ getStyles, setTheme, icons, setIcons }}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeProviderContext)

// Combines a named theme (or none) with any custom overrides into a single
// Theme object
const compileStyles = (themeInput: ThemeInput): CompiledStyles => {
  // Theme name only provided
  if (typeof themeInput === 'string') return buildStyleObject(themes[themeInput])

  // Theme name with overrides
  if (Array.isArray(themeInput)) {
    const [name, overrides] = themeInput
    return buildStyleObject(
      themes[name],
      isStyleObject(overrides) ? { styles: overrides } : overrides
    )
  }

  // Overrides only
  return buildStyleObject(
    defaultTheme,
    isStyleObject(themeInput) ? { styles: themeInput } : themeInput
  )
}

const buildStyleObject = (
  baseTheme: Theme,
  overrides: Theme = { styles: emptyStyleObject }
): CompiledStyles => {
  // Replace fragments and merge properties
  const [defaultStyles, baseStyles, overrideStyles] = [defaultTheme, baseTheme, overrides].map(
    (theme) => {
      const { fragments, styles } = theme
      const compiledStyles: Partial<CompiledStyles> = {}
      ;(Object.entries(styles) as Array<[ThemeableElement, ThemeValue]>).forEach(([key, value]) => {
        if (typeof value === 'function') {
          compiledStyles[key as ThemeableElement] = value
          return
        }
        const elements = Array.isArray(value) ? value : [value]
        const cssStyles = elements.reduce((acc: React.CSSProperties, curr) => {
          if (typeof curr === 'string') {
            const style = fragments?.[curr] ?? curr
            switch (typeof style) {
              case 'string':
                return { ...acc, [defaultStyleProperties[key as ThemeableElement]]: style }
              default:
                return { ...acc, ...style }
            }
          } else return { ...acc, ...curr }
        }, {})
        compiledStyles[key as ThemeableElement] = cssStyles
      })
      return compiledStyles
    }
  )

  // Merge the two compiled style objects with the default styles
  const finalStyles: Partial<CompiledStyles> = {}
  ;(Object.keys(defaultTheme.styles) as ThemeableElement[]).forEach((key) => {
    finalStyles[key] = {
      ...defaultStyles[key],
      ...baseStyles[key],
      ...overrideStyles[key],
    }
    // Replace with ThemeFunction if present
    if (typeof baseStyles[key] === 'function') {
      finalStyles[key] = (nodeData: NodeData) => {
        const funcResult = (baseStyles[key] as ThemeFunction)(nodeData)
        return (funcResult ?? defaultStyles[key]) as React.CSSProperties
      }
    }
    if (typeof overrideStyles[key] === 'function') {
      finalStyles[key] = (nodeData: NodeData) => {
        const funcResult = (overrideStyles[key] as ThemeFunction)(nodeData)
        return (funcResult ?? baseStyles[key] ?? defaultStyles[key]) as React.CSSProperties
      }
    }
  })

  // These properties can't be targeted inline, so we update a CSS variable
  // instead
  if (
    typeof finalStyles?.inputHighlight !== 'function' &&
    finalStyles?.inputHighlight?.backgroundColor
  ) {
    document.documentElement.style.setProperty(
      '--jer-highlight-color',
      finalStyles?.inputHighlight?.backgroundColor
    )
  }
  if (typeof finalStyles?.iconCopy !== 'function' && finalStyles?.iconCopy?.color) {
    document.documentElement.style.setProperty(
      '--jer-icon-copy-color',
      finalStyles?.iconCopy?.color
    )
  }

  return finalStyles as CompiledStyles
}

const isStyleObject = (
  overrideObject: Theme | Partial<ThemeStyles>
): overrideObject is Partial<ThemeStyles> => {
  return !('styles' in overrideObject)
}

const defaultStyleProperties: { [Property in ThemeableElement]: keyof React.CSSProperties } = {
  container: 'backgroundColor',
  property: 'color',
  bracket: 'color',
  itemCount: 'color',
  string: 'color',
  number: 'color',
  boolean: 'color',
  null: 'color',
  input: 'color',
  inputHighlight: 'backgroundColor',
  error: 'color',
  iconCollection: 'color',
  iconEdit: 'color',
  iconDelete: 'color',
  iconAdd: 'color',
  iconCopy: 'color',
  iconOk: 'color',
  iconCancel: 'color',
}
