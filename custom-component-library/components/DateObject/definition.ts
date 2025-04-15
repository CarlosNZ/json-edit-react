import { DateObjectCustomComponent } from './component'
import { type CustomNodeDefinition } from 'json-edit-react'

export const DateObjectDefinition: CustomNodeDefinition = {
  condition: (nodeData) => nodeData.value instanceof Date,
  element: DateObjectCustomComponent,
  showEditTools: true,
  showOnEdit: true,
}
