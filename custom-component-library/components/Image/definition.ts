import { type CustomNodeDefinition } from '@json-edit-react'
import { ImageComponent, ImageProps } from './component'

const imageLinkRegex = /^https?:\/\/[^\s]+?\.(?:jpe?g|png|svg|gif)/i

export const ImageNodeDefinition: CustomNodeDefinition<ImageProps> = {
  condition: ({ value }) => typeof value === 'string' && imageLinkRegex.test(value),
  element: ImageComponent,
  // customNodeProps: {},
  showOnView: true,
  showOnEdit: false,
  name: 'Image',
}
