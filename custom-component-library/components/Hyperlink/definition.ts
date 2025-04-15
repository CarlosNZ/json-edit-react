import { type CustomNodeDefinition } from 'json-edit-react'
import { LinkCustomComponent } from './component'

export const LinkCustomNodeDefinition: CustomNodeDefinition<{
  linkStyles?: React.CSSProperties
  stringTruncate?: number
}> = {
  // Condition is a regex to match url strings
  condition: ({ value }) => typeof value === 'string' && /^https?:\/\/.+\..+$/.test(value),
  element: LinkCustomComponent,
  // customNodeProps: { stringTruncate: 80 },
  showOnView: true,
  showOnEdit: false,
}
