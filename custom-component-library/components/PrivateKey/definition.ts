import { type CustomNodeDefinition } from '@json-edit-react'
import { PrivateKeyComponent } from './component'

// Matches any key starting with `_` and renders a "private" indicator on the
// key. Demonstrates the new `customKey` field on `CustomNodeDefinition` —
// works for both value nodes (e.g. `_secret: 'shh'`) and collection nodes
// (e.g. `_internal: { ... }`) with the same definition.
export const PrivateKeyDefinition: CustomNodeDefinition = {
  condition: ({ key }) => typeof key === 'string' && key.startsWith('_'),
  customKey: PrivateKeyComponent,
}
