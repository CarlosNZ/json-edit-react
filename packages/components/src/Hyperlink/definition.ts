import { type CustomNodeDefinition } from 'json-edit-react'
import { createDefinitionFactory } from '../_common/createDefinitionFactory'
import { LinkCustomComponent, LinkProps } from './component'

// The condition doubles as the guard: consumer `condition` overrides are
// targeting, ANDed with this by the factory; replacing it requires the
// explicit `guard` override.
const LinkCustomNodeDefinition: CustomNodeDefinition<LinkProps> = {
  condition: ({ value }) => typeof value === 'string' && /^https?:\/\/.+\..+$/.test(value),
  component: LinkCustomComponent,
  componentProps: { stringTruncateLength: 80 },
  showOnView: true,
  showOnEdit: false,
}

export const hyperlinkDefinition = createDefinitionFactory(LinkCustomNodeDefinition)
