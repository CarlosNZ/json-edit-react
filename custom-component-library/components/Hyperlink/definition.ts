import { type CustomNodeDefinition } from '../_imports'
import { LinkCustomComponent, LinkProps } from './component'

export const LinkCustomNodeDefinition: CustomNodeDefinition<LinkProps> = {
  // Condition is a regex to match url strings
  condition: ({ value }) => typeof value === 'string' && /^https?:\/\/.+\..+$/.test(value),
  element: LinkCustomComponent,
  customNodeProps: { stringTruncate: 80 },
  showOnView: true,
  showOnEdit: false,
}
