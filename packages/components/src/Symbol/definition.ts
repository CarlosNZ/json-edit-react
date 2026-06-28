import { isCollection, type CustomNodeDefinition } from 'json-edit-react'
import { createDefinitionFactory } from '../_common/createDefinitionFactory'
import { SymbolComponent, SymbolProps } from './component'

// The condition doubles as the guard: consumer `condition` overrides are
// targeting, ANDed with this by the factory; replacing it requires the
// explicit `guard` override.
const SymbolDefinition: CustomNodeDefinition<SymbolProps> = {
  condition: ({ value }) => typeof value === 'symbol',
  component: SymbolComponent,
  showOnView: true,
  showEditTools: true,
  showOnEdit: true,
  name: 'Symbol', // shown in the Type selector menu
  showInTypeSelector: true,
  editOnTypeSwitch: true,
  // A function so each new node gets its own unique symbol, and so it isn't
  // built at module load (keeps the definition tree-shakeable).
  defaultValue: () => Symbol('New symbol'),
  // The editable text of a symbol is its description
  toStandardType: (value) =>
    typeof value === 'symbol' ? (value.description ?? '') : String(value),
  fromStandardType: (value) => (typeof value === 'symbol' ? value : Symbol(String(value ?? ''))),
  stringifyReplacer: (value) =>
    typeof value === 'symbol' ? { __type: 'Symbol', value: value.description ?? '' } : value,
  parseReviver: (value) =>
    isCollection(value) && '__type' in value && 'value' in value && value.__type === 'Symbol'
      ? Symbol((value.value as string) ?? null)
      : value,
}

export const symbolDefinition = createDefinitionFactory(SymbolDefinition)
