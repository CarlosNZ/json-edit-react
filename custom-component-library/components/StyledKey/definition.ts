import { type CustomKeyDefinition } from '@json-edit-react'
import { ErrorKeyComponent, PrivateKeyComponent } from './component'

// Keys containing "error" (case-insensitive) rendered in red bold
export const ErrorKeyDefinition: CustomKeyDefinition = {
  condition: ({ key }) => typeof key === 'string' && key.toLowerCase().includes('error'),
  element: ErrorKeyComponent,
}

// Keys starting with underscore rendered in italic, dimmed
export const PrivateKeyDefinition: CustomKeyDefinition = {
  condition: ({ key }) => typeof key === 'string' && key.startsWith('_'),
  element: PrivateKeyComponent,
}
