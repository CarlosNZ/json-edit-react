import { type CustomNodeDefinition } from 'json-edit-react'
import { LinkCustomComponent, LinkProps } from './component'

export const LinkCustomNodeDefinition: CustomNodeDefinition<LinkProps> = {
  // Condition is a regex to match url strings
  condition: ({ value }) => typeof value === 'string' && /^https?:\/\/.+\..+$/.test(value),
  component: LinkCustomComponent,
  componentProps: { stringTruncateLength: 80 },
  showOnView: true,
  showOnEdit: false,
}
