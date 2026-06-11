import { isCollection, type CustomNodeDefinition } from 'json-edit-react'
import { SymbolComponent, SymbolProps } from './component'

export const SymbolDefinition: CustomNodeDefinition<SymbolProps> = {
  condition: ({ value }) => typeof value === 'symbol',
  component: SymbolComponent,
  // componentProps: {},
  showOnView: true,
  showEditTools: true,
  showOnEdit: true,
  name: 'Symbol', // shown in the Type selector menu
  showInTypeSelector: true,
  editOnTypeSwitch: true,
  defaultValue: Symbol('New symbol'),
  // The editable text of a symbol is its description
  toStandardType: (value) =>
    typeof value === 'symbol' ? (value.description ?? '') : String(value),
  fromStandardType: (value) => Symbol(String(value ?? '')),
  fromEditBuffer: (buffer) => (typeof buffer === 'symbol' ? buffer : Symbol(String(buffer))),
  stringifyReplacer: (value) =>
    typeof value === 'symbol' ? { __type: 'Symbol', value: value.description ?? '' } : value,
  parseReviver: (value) =>
    isCollection(value) && '__type' in value && 'value' in value && value.__type === 'Symbol'
      ? Symbol((value.value as string) ?? null)
      : value,
}
