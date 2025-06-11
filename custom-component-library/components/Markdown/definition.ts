import { type CustomNodeDefinition } from '@json-edit-react'
import { MarkdownComponent, MarkdownCustomProps } from './component'

export const MarkdownNodeDefinition: CustomNodeDefinition<MarkdownCustomProps> = {
  condition: () => false, // Over-ride this for specific cases
  element: MarkdownComponent,
  // customNodeProps: {},
  showOnView: true,
  showOnEdit: false,
}
