import { type CustomNodeDefinition } from 'json-edit-react'
import { MarkdownComponent, MarkdownCustomProps } from './component'

export const MarkdownNodeDefinition: CustomNodeDefinition<MarkdownCustomProps> = {
  condition: ({ value }) => typeof value === 'string', // Over-ride this for specific cases
  component: MarkdownComponent,
  // componentProps: {},
  showOnView: true,
  showOnEdit: false,
}
