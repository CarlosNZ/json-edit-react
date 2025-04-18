import { type CustomNodeDefinition } from '@json-edit-react'
import { SymbolComponent, SymbolProps } from './component'

export const SymbolDefinition: CustomNodeDefinition<SymbolProps> = {
  condition: ({ value }) => typeof value === 'symbol',
  element: SymbolComponent,
  // customNodeProps: {},
  showOnView: true,
  showEditTools: true,
  showOnEdit: true,
  name: 'Symbol', // shown in the Type selector menu
  showInTypesSelector: true,
  defaultValue: Symbol('New symbol'),
}
