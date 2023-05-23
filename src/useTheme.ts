import { useEffect, useState } from 'react'
import { themes, ThemeProps, ThemePropName } from './themes'
import { ThemeInput } from './types'

export const useTheme = (theme: ThemeInput) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeProps>(getThemeObject(theme))

  const setTheme = (theme: ThemeInput) => setCurrentTheme(getThemeObject(theme))

  useEffect(() => {
    Object.entries(currentTheme).forEach(([key, value]) => {
      if (key === 'name') return
      const varName = themeVariableMap[key as ThemePropName]
      document.documentElement.style.setProperty(varName, value)
    })
  }, [currentTheme])

  return { theme: currentTheme, setTheme }
}

// Translate theme properties into CSS variable names
const themeVariableMap: { [Property in ThemePropName]: string } = {
  bgColor: '--jer-bg-color',
  borderColor: '--jer-border-color',
  mainFont: '--jer-main-font',
  mainFontColor: '--jer-main-color',
  bracketColor: '--jer-bracket-color',
  parentheticalColor: '--jer-parenthetical-color',
  stringColor: '--jer-string-color',
  numberColor: '--jer-number-color',
  booleanColor: '--jer-boolean-color',
  nullColor: '--jer-null-color',
  inputColor: '--jer-input-color',
  highlightColor: '--jer-highlight-color',
  iconChevronColor: '--jer-icon-chevron-color',
  iconEditColor: '--jer-icon-edit-color',
  iconDeleteColor: '--jer-icon-delete-color',
  iconAddColor: '--jer-icon-add-color',
  iconCopyColor: '--jer-icon-copy-color',
  iconOkColor: '--jer-icon-ok-color',
  iconCancelColor: '--jer-icon-cancel-color',
}

// Combines a named theme (or none) with any custom overrides into a single
// Theme object
const getThemeObject = (theme: ThemeInput): ThemeProps => {
  // Theme name only provided
  if (typeof theme === 'string' && Object.keys(themes).includes(theme)) return themes[theme]

  // Theme name with overrides
  if (Array.isArray(theme)) {
    const [name, overrides] = theme
    return { ...themes[name], ...overrides }
  }

  // Overrides only
  return { ...themes.default, ...(theme as Partial<ThemeProps>) }
}
