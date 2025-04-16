import { NotANumberComponent, NaNProps } from './component'
import { type CustomNodeDefinition } from '@json-edit-react'

export const NanDefinition: CustomNodeDefinition<NaNProps> = {
  // eslint-disable-next-line -- isNaN can accept anything
  condition: ({ value, size }) => size === null && isNaN(value as any),
  element: NotANumberComponent,
  showEditTools: true,
  showOnEdit: true,
  name: 'NaN', // shown in the Type selector menu
  showInTypesSelector: true,
  defaultValue: NaN,
}
