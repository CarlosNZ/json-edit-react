import { type CustomNodeDefinition } from '@json-edit-react'
import { KeyedLinkKeyComponent, KeyedLinkValueComponent } from './component'

// Demonstrates one definition customising BOTH the key slot (`customKey`) and
// the value slot (`element`). Matches keys nested in a `Links` parent so it
// doesn't fight with the existing `LinkCustomNodeDefinition` example.
export const KeyedLinkDefinition: CustomNodeDefinition = {
  condition: ({ value, path }) =>
    typeof value === 'string' &&
    /^https?:\/\/.+\..+$/.test(value) &&
    path.includes('Linked Resources'),
  customKey: KeyedLinkKeyComponent,
  element: KeyedLinkValueComponent,
  showOnView: true,
  showOnEdit: false,
}
