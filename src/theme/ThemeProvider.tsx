import React, { createContext, useContext, useEffect, useState } from 'react'
import { themes, ThemeName, emptyStyleObject } from './themes'

const themeElements = [
  'container',
  'property',
  'bracket',
  'bracketContent',
  'string',
  'number',
  'boolean',
  'null',
  'input',
  'iconCollection',
  'iconEdit',
  'iconDelete',
  'iconAdd',
  'iconCopy',
  'iconOk',
  'iconCancel',
] as const

export type ThemeElement = (typeof themeElements)[number]
type ThemeElementValue = string | React.CSSProperties | Array<string | React.CSSProperties>

type Snippets = Record<string, React.CSSProperties>
export type ThemeElements = Record<ThemeElement, ThemeElementValue>

export interface Theme {
  displayName?: string
  snippets?: Snippets
  style: Partial<ThemeElements>
}

export interface BaseTheme extends Theme {
  displayName: 'Default'
  style: ThemeElements
}

export type CompiledStyles = Record<ThemeElement, React.CSSProperties>

export type ThemeInput =
  | ThemeName
  | Theme
  | Partial<ThemeElements>
  | [ThemeName, Theme | Partial<ThemeElements>]

const initialContext = {
  styles: {},
  setTheme: (_: ThemeInput) => {},
}

const ThemeProviderContext = createContext(initialContext)

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  //   const [theme, setTheme] = useState<ThemeInput>()
  const [styles, setStyles] = useState<CompiledStyles>(emptyStyleObject)

  const setTheme = (theme: ThemeInput) => setStyles(compileStyles(theme))

  //   useEffect(() => {
  //     if (theme) setStyles(compileStyles(theme))
  //   }, [theme])

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
      isStyleObject(overrides) ? { style: overrides } : overrides
    )
  }

  // Overrides only
  return buildStyleObject(
    themes.default,
    isStyleObject(themeInput) ? { style: themeInput } : themeInput
  )
}

const buildStyleObject = (
  baseTheme: Theme,
  overrides: Theme = { style: emptyStyleObject }
): CompiledStyles => {
  // Replace snippets and merge properties
  const [baseStyles, overrideStyles] = [baseTheme, overrides].map((theme) => {
    const { snippets, style } = theme
    const compiledStyles: any = {}
    Object.entries(style).forEach(([key, value]) => {
      const elements = Array.isArray(value) ? value : [value]
      const cssStyles = elements.reduce((acc: React.CSSProperties, curr) => {
        if (typeof curr === 'string') {
          const style = snippets?.[curr] ?? curr
          switch (typeof style) {
            case 'string':
              return { ...acc, color: style }
            default:
              return { ...acc, ...style }
          }
        } else return { ...acc, ...curr }
      }, {})
      compiledStyles[key] = cssStyles
    })
    return compiledStyles
  })

  // Merge the two compiled style objects
  const finalStyles: Partial<CompiledStyles> = {}
  Object.keys(themes.default.style).forEach((key) => {
    finalStyles[key as ThemeElement] = { ...baseStyles[key], ...overrideStyles[key] }
  })

  return finalStyles as CompiledStyles
}

const isStyleObject = (
  overrideObject: Theme | Partial<ThemeElements>
): overrideObject is Partial<ThemeElements> => {
  return 'style' in overrideObject
}
