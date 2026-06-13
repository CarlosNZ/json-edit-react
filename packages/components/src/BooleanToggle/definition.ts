import { type CustomNodeDefinition } from 'json-edit-react'
import { createDefinitionFactory } from '../_common/createDefinitionFactory'
import { BooleanToggleComponent } from './component'

// The condition doubles as the guard: consumer `condition` overrides are
// targeting, ANDed with this by the factory; replacing it requires the
// explicit `guard` override.
const BooleanToggleDefinition: CustomNodeDefinition = {
  condition: ({ value }) => typeof value === 'boolean',
  component: BooleanToggleComponent,
  showOnView: true,
  showOnEdit: false,
  showEditTools: true,
}

export const booleanToggleDefinition = createDefinitionFactory(BooleanToggleDefinition)
