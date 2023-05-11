import { useEffect, useState } from 'react'

export const defaultTheme = {
  bgColor: 'lightgrey',
  mainFont: 'monospace',
  mainColor: 'darkslategrey',
  secondaryColor: 'grey',
  parentheticalColor: 'black',
  stringColor: 'orange',
  numberColor: 'blue',
  booleanColor: 'green',
  nullColor: 'red',
  altBgColor: 'grey',
  iconColor: 'turquoise',
  iconChevronColor: 'darkblue',
  iconEditColor: 'yellow',
  iconDeleteColor: 'red',
  iconAddColor: 'darkgreen',
  iconCopyColor: 'brown',
  iconOkColor: 'green',
  iconCancelColor: 'darkred',
}

export type ThemeProps = typeof defaultTheme

export const useTheme = (theme: Partial<ThemeProps>) => {
  const [currentTheme, setCurrentTheme] = useState<Partial<ThemeProps>>({
    ...defaultTheme,
    ...theme,
  })

  useEffect(() => {
    Object.entries(currentTheme).forEach(([key, value]) => {
      const varName = themeVariableMap[key as keyof ThemeProps]
      document.documentElement.style.setProperty(varName, value)
    })
  }, [currentTheme])

  return { theme: currentTheme, setTheme: setCurrentTheme }
}

const themeVariableMap: { [Property in keyof ThemeProps]: string } = {
  bgColor: '--fg-bg-color',
  mainFont: '--fg-main-font',
  mainColor: '--fg-main-color',
  secondaryColor: '--fg-secondary-color',
  parentheticalColor: '--fg-parenthetical-color',
  stringColor: '--fg-string-color',
  numberColor: '--fg-number-color',
  booleanColor: '--fg-boolean-color',
  nullColor: '--fg-null-color',
  altBgColor: '--fg-alt-bg-color',
  iconColor: '--fg-icon-color',
  iconChevronColor: '--fg-icon-chevron-color',
  iconEditColor: '--fg-icon-edit-color',
  iconDeleteColor: '--fg-icon-delete-color',
  iconAddColor: '--fg-icon-add-color',
  iconCopyColor: '--fg-icon-copy-color',
  iconOkColor: '--fg-icon-ok-color',
  iconCancelColor: '--fg-icon-cancel-color',
}
