import { type CustomNodeDefinition } from 'json-edit-react'
import { BooleanToggleComponent } from './component'

export const BooleanToggleDefinition: CustomNodeDefinition<{
  linkStyles?: React.CSSProperties
  stringTruncateLength?: number
}> = {
  condition: ({ value }) => typeof value === 'boolean',
  component: BooleanToggleComponent,
  showOnView: true,
  showOnEdit: false,
  showEditTools: true,
}
