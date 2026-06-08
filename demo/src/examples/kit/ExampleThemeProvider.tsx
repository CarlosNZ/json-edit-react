import { type ReactNode } from 'react'
import { type Theme } from '@json-edit-react'
import { ExampleThemeContext } from './exampleThemeContext'

export const ExampleThemeProvider = ({
  theme,
  children,
}: {
  theme: Theme
  children: ReactNode
}) => <ExampleThemeContext.Provider value={theme}>{children}</ExampleThemeContext.Provider>
