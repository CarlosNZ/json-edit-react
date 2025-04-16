import { UndefinedCustomComponent, UndefinedProps } from './component'
import { type CustomNodeDefinition } from '../_imports'

export const UndefinedDefinition: CustomNodeDefinition<UndefinedProps> = {
  condition: ({ value }) => value === undefined,
  element: UndefinedCustomComponent,
  showEditTools: true,
  showOnEdit: true,
  name: 'undefined', // shown in the Type selector menu
  showInTypesSelector: true,
  defaultValue: undefined,
}
