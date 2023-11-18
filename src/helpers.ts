import { CustomNodeDefinition, FilterProps } from './types'

// Fetches matching custom nodes (based on condition filter) from custom node
// definitions and return the component and its props
export const getCustomNode = (
  customNodeDefinitions: CustomNodeDefinition[] = [],
  filterProps: FilterProps
) => {
  const matchingDefinitions = customNodeDefinitions.filter(({ condition }) =>
    condition(filterProps)
  )
  if (matchingDefinitions.length === 0) return {}

  // Only take the first one that matches
  const { element, props, hideKey = false } = matchingDefinitions[0]

  return { CustomNode: element, customNodeProps: props, hideKey }
}
