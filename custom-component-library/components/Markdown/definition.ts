import { type CustomNodeDefinition } from '@json-edit-react'
import { MarkdownComponent, LinkProps } from './component'

export const MarkdownNodeDefinition: CustomNodeDefinition<LinkProps> = {
  condition: () => false, // Over-ride this for specific cases
  element: MarkdownComponent,
  // customNodeProps: {},
  showOnView: true,
  showOnEdit: false,
}
