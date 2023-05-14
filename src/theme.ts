import { useEffect, useState } from 'react'

export const defaultTheme = {
  bgColor: '#f6f6f6',
  mainFont: 'monospace',
  mainColor: 'rgb(0, 43, 54)',
  secondaryColor: 'grey',
  bracketColor: 'rgb(0, 43, 54)',
  parentheticalColor: 'rgba(0, 0, 0, 0.3)',
  stringColor: 'rgb(203, 75, 22)',
  numberColor: 'rgb(38, 139, 210)',
  booleanColor: 'green',
  nullColor: 'rgb(220, 50, 47)',
  altBgColor: 'grey',
  iconColor: 'turquoise',
  iconChevronColor: 'rgb(0, 43, 54)',
  iconEditColor: 'rgb(42, 161, 152)',
  iconDeleteColor: 'rgb(203, 75, 22)',
  iconAddColor: 'rgb(42, 161, 152)',
  iconCopyColor: 'rgb(38, 139, 210)',
  iconOkColor: 'green',
  iconCancelColor: 'rgb(203, 75, 22)',
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
  bracketColor: '--fg-bracket-color',
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
