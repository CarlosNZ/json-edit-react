import { NotANumberComponent, NaNProps } from './component'
import { isCollection, type CustomNodeDefinition } from 'json-edit-react'
import { createDefinitionFactory } from '../_common/createDefinitionFactory'

// The condition doubles as the guard: consumer `condition` overrides are
// targeting, ANDed with this by the factory; replacing it requires the
// explicit `guard` override.
const NanDefinition: CustomNodeDefinition<NaNProps> = {
  condition: ({ value }) => Number.isNaN(value),
  component: NotANumberComponent,
  showEditTools: true,
  showOnEdit: true,
  name: 'NaN', // shown in the Type selector menu
  showInTypeSelector: true,
  defaultValue: NaN,
  stringifyReplacer: (value) => (Number.isNaN(value) ? { __type: 'NaN', value: 'NaN' } : value),
  parseReviver: (value) =>
    isCollection(value) && '__type' in value && 'value' in value && value.__type === 'NaN'
      ? NaN
      : value,
}

export const nanDefinition = createDefinitionFactory(NanDefinition)
