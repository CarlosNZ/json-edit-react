import { type CustomNodeDefinition } from '@json-edit-react'
import { MarkdownComponent, ReactMarkdownProps } from './component'

export const MarkdownNodeDefinition: CustomNodeDefinition<ReactMarkdownProps> = {
  condition: () => false, // Over-ride this for specific cases
  element: MarkdownComponent,
  // customNodeProps: {},
  showOnView: true,
  showOnEdit: false,
}
