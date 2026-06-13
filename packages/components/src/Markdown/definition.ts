import { type CustomNodeDefinition } from 'json-edit-react'
import { createDefinitionFactory } from '../_common/createDefinitionFactory'
import { MarkdownComponent, MarkdownCustomProps } from './component'

// The condition doubles as the guard: consumer `condition` overrides are
// targeting, ANDed with this by the factory; replacing it requires the
// explicit `guard` override.
const MarkdownNodeDefinition: CustomNodeDefinition<MarkdownCustomProps> = {
  condition: ({ value }) => typeof value === 'string',
  component: MarkdownComponent,
  showOnView: true,
  showOnEdit: false,
}

export const markdownDefinition = createDefinitionFactory(MarkdownNodeDefinition)
