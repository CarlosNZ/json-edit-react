import React, { createContext, useContext, useState } from 'react'
import { themes, emptyStyleObject } from './themes'
import {
  type Theme,
  type ThemeableElement,
  type ThemeStyles,
  type ThemeInput,
  type CompiledStyles,
  type ThemeValue,
  type ThemeFunction,
  type NodeData,
  type IconReplacements,
} from '../types'

const defaultTheme = themes.default

interface ThemeContext {
  getStyles: (element: ThemeableElement, nodeData: NodeData) => React.CSSProperties
  setTheme: (theme: ThemeInput) => void
  icons: IconReplacements
  setIcons: React.Dispatch<React.SetStateAction<IconReplacements>>
}
const initialContext: ThemeContext = {
  getStyles: () => ({}),
  setTheme: (_: ThemeInput) => {},
  icons: {},
  setIcons: () => {},
}

const ThemeProviderContext = createContext(initialContext)

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [styles, setStyles] = useState<CompiledStyles>(emptyStyleObject)
  const [icons, setIcons] = useState<IconReplacements>({})

  const setTheme = (theme: ThemeInput) => {
    const styles = compileStyles(theme)
    setStyles(styles)
  }

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
  const collectedFunctions: Partial<Record<ThemeableElement, ThemeFunction>> = {}

  // First collect all elements into an array of the same type of thing -- style
  // objects
  const stylesArray = (Array.isArray(themeInput) ? themeInput : [themeInput]).map((theme) => {
    if (themeInput === 'default') return {}
    if (typeof theme === 'string') return buildStyleObject(themes[theme], collectedFunctions)
    if (isStyleObject(theme)) {
      return buildStyleObject({ fragments: {}, styles: theme }, collectedFunctions)
    }
    return buildStyleObject(theme, collectedFunctions)
  })

  // Merge all style objects
  const mergedStyleObject = buildStyleObject(defaultTheme, {})

  Object.keys(mergedStyleObject).forEach((k) => {
    const key = k as ThemeableElement
    stylesArray.forEach((styleObj) => {
      if (styleObj[key]) mergedStyleObject[key] = { ...mergedStyleObject[key], ...styleObj[key] }
    })
  })

  // Merge functions into compiledStyles
  const finalStyles = { ...mergedStyleObject }
  Object.entries(collectedFunctions).forEach(([key, func]) => {
    const element = key as ThemeableElement
    const mergedFunction = (nodeData: NodeData) => {
      const funcResult = func(nodeData) || {}
      return { ...mergedStyleObject[element], ...funcResult }
    }
    finalStyles[element] = mergedFunction
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

// Inject all fragments in to styles and return just the compiled style object
// (and collect any functions for later merging)
const buildStyleObject = (
  theme: Theme,
  collectedFunctions: Partial<Record<ThemeableElement, ThemeFunction>>
) => {
  const { fragments, styles } = theme
  const styleObject: Partial<CompiledStyles> = {}
  ;(Object.entries(styles) as Array<[ThemeableElement, ThemeValue]>).forEach(([key, value]) => {
    const elements = Array.isArray(value) ? value : [value]
    const cssStyles = elements.reduce((acc: React.CSSProperties, curr) => {
      if (typeof curr === 'function') {
        collectedFunctions[key] = curr
        return { ...acc }
      }
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
    styleObject[key as ThemeableElement] = cssStyles
  })
  return styleObject
}

const isStyleObject = (
  overrideObject: Theme | Partial<ThemeStyles>
): overrideObject is Partial<ThemeStyles> => {
  return !('styles' in overrideObject)
}

const defaultStyleProperties: { [Property in ThemeableElement]: keyof React.CSSProperties } = {
  container: 'backgroundColor',
  collection: 'backgroundColor',
  collectionInner: 'backgroundColor',
  collectionElement: 'backgroundColor',
  dropZone: 'borderColor',
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
