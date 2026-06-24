import { type CustomNodeDefinition } from 'json-edit-react'
import { createDefinitionFactory } from '../_common/createDefinitionFactory'
import { ImageComponent, ImageProps } from './component'

const imageLinkRegex = /^https?:\/\/[^\s]+?\.(?:jpe?g|png|svg|gif)/i

// The condition doubles as the guard: consumer `condition` overrides are
// targeting, ANDed with this by the factory; replacing it requires the
// explicit `guard` override.
const ImageNodeDefinition: CustomNodeDefinition<ImageProps> = {
  condition: ({ value }) => typeof value === 'string' && imageLinkRegex.test(value),
  component: ImageComponent,
  showOnView: true,
  showOnEdit: false,
  name: 'Image',
}

export const imageDefinition = createDefinitionFactory(ImageNodeDefinition)
