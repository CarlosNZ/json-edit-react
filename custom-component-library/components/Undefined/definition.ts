import { UndefinedCustomComponent } from './component'
import { type CustomNodeDefinition } from 'json-edit-react'

export const UndefinedDefinition: CustomNodeDefinition = {
  condition: ({ value }) => value === undefined,
  element: UndefinedCustomComponent,
  showEditTools: true,
  showOnEdit: true,
  name: 'undefined', // shown in the Type selector menu
  showInTypesSelector: true,
  defaultValue: undefined,
}
