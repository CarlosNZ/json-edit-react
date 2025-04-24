import { NotANumberComponent, NaNProps } from './component'
import { isCollection, type CustomNodeDefinition } from '@json-edit-react'

export const NanDefinition: CustomNodeDefinition<NaNProps> = {
  condition: ({ value }) => Number.isNaN(value),
  element: NotANumberComponent,
  showEditTools: true,
  showOnEdit: true,
  name: 'NaN', // shown in the Type selector menu
  showInTypesSelector: true,
  defaultValue: NaN,
  stringifyReplacer: (value) => (Number.isNaN(value) ? { __type: 'NaN', value: 'NaN' } : value),
  parseReviver: (value) =>
    isCollection(value) && '__type' in value && 'value' in value && value.__type === 'NaN'
      ? NaN
      : value,
}
