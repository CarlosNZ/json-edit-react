import { type CustomNodeProps, type CustomNodeDefinition } from 'json-edit-react'
import { LinkCustomComponent } from './component'

export const LinkCustomNodeDefinition: CustomNodeDefinition = {
  // Condition is a regex to match url strings
  condition: ({ value }) => typeof value === 'string' && /^https?:\/\/.+\..+$/.test(value),
  element: LinkCustomComponent as React.FC<CustomNodeProps>,
  showOnView: true,
  showOnEdit: false,
}
