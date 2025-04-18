import { UndefinedCustomComponent, UndefinedProps } from './component'
import { type CustomNodeDefinition } from '@json-edit-react'

export const UndefinedDefinition: CustomNodeDefinition<UndefinedProps> = {
  condition: ({ value }) => value === undefined,
  element: UndefinedCustomComponent,
  showEditTools: true,
  showOnEdit: true,
  name: 'undefined', // shown in the Type selector menu
  showInTypesSelector: true,
  defaultValue: undefined,
  // These not required as "undefined" is a special case which won't work with a
  // standard reviver, so is handled internally
  // stringifyReplacer:
  // parseReviver:
}
