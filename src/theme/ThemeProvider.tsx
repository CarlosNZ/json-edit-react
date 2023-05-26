import React, { createContext, useContext, useState } from 'react'
import {
  themes,
  emptyStyleObject,
  Theme,
  ThemeableElement,
  ThemeStyles,
  ThemeInput,
  CompiledStyles,
  ThemeValue,
} from './themes'

const defaultTheme = themes.default

const initialContext = {
  styles: emptyStyleObject,
  setTheme: (_: ThemeInput) => {},
}

const ThemeProviderContext = createContext(initialContext)

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [styles, setStyles] = useState<CompiledStyles>(emptyStyleObject)

  const setTheme = (theme: ThemeInput) => setStyles(compileStyles(theme))

  return (
    <ThemeProviderContext.Provider value={{ styles, setTheme }}>
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
      ;(Object.entries(styles) as [ThemeableElement, ThemeValue][]).forEach(([key, value]) => {
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

  // Merge the two compiled style objects
  const finalStyles: Partial<CompiledStyles> = {}
  ;(Object.keys(defaultTheme.styles) as ThemeableElement[]).forEach((key) => {
    finalStyles[key] = {
      ...defaultStyles[key],
      ...baseStyles[key],
      ...overrideStyles[key],
    }
  })

  // Over-ride the input highlight color manually, because we can't target this
  // inline
  if (finalStyles?.inputHighlight?.backgroundColor)
    document.documentElement.style.setProperty(
      '--jer-highlight-color',
      finalStyles?.inputHighlight?.backgroundColor
    )

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
