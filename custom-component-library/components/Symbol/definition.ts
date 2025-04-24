import { isCollection, type CustomNodeDefinition } from '@json-edit-react'
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
  stringifyReplacer: (value) =>
    typeof value === 'symbol' ? { __type: 'Symbol', value: value.description ?? '' } : value,
  parseReviver: (value) =>
    isCollection(value) && '__type' in value && 'value' in value && value.__type === 'Symbol'
      ? Symbol((value.value as string) ?? null)
      : value,
}
