import { type CustomNodeDefinition } from 'json-edit-react'
import { BooleanToggleComponent } from './component'

export const BooleanToggleDefinition: CustomNodeDefinition<{
  linkStyles?: React.CSSProperties
  stringTruncate?: number
}> = {
  condition: ({ value }) => typeof value === 'boolean',
  element: BooleanToggleComponent,
  showOnView: true,
  showOnEdit: false,
  showEditTools: true,
}
