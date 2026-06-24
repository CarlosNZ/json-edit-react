import { type ReactNode } from 'react'
import { ExampleEditorContext, type ExampleEditorProps } from './exampleProps'

export const ExampleEditorProvider = ({
  value,
  children,
}: {
  value: ExampleEditorProps
  children: ReactNode
}) => <ExampleEditorContext.Provider value={value}>{children}</ExampleEditorContext.Provider>
