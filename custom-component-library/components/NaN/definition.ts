import { NotANumberComponent, NaNProps } from './component'
import { type CustomNodeDefinition } from '@json-edit-react'

export const NanDefinition: CustomNodeDefinition<NaNProps> = {
  condition: ({ value }) => Number.isNaN(value),
  element: NotANumberComponent,
  showEditTools: true,
  showOnEdit: true,
  name: 'NaN', // shown in the Type selector menu
  showInTypesSelector: true,
  defaultValue: NaN,
}
