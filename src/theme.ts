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
  bgColor: '--jer-bg-color',
  mainFont: '--jer-main-font',
  mainColor: '--jer-main-color',
  secondaryColor: '--jer-secondary-color',
  bracketColor: '--jer-bracket-color',
  parentheticalColor: '--jer-parenthetical-color',
  stringColor: '--jer-string-color',
  numberColor: '--jer-number-color',
  booleanColor: '--jer-boolean-color',
  nullColor: '--jer-null-color',
  altBgColor: '--jer-alt-bg-color',
  iconColor: '--jer-icon-color',
  iconChevronColor: '--jer-icon-chevron-color',
  iconEditColor: '--jer-icon-edit-color',
  iconDeleteColor: '--jer-icon-delete-color',
  iconAddColor: '--jer-icon-add-color',
  iconCopyColor: '--jer-icon-copy-color',
  iconOkColor: '--jer-icon-ok-color',
  iconCancelColor: '--jer-icon-cancel-color',
}
