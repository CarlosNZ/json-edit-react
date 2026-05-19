import { CustomKeyDefinition, CustomNodeDefinition } from '@json-edit-react'
import { SearchHighlightKey, SearchHighlightNode, SearchHighlightProps } from './component'

export const createSearchHighlightNodeDefinition = (
  customNodeProps: SearchHighlightProps,
): Array<CustomNodeDefinition> => [
  {
    condition: ({ value }) => !(typeof value === 'object' && value !== null),
    element: SearchHighlightNode,
    customNodeProps,
    showOnView: true,
    name: 'SearchHighlightNode',
  },
]

export const createSearchHighlightKeyDefinition = (
  customKeyProps: SearchHighlightProps,
): Array<CustomKeyDefinition> => [
  {
    condition: () => true,
    element: SearchHighlightKey,
    customKeyProps,
  },
]
