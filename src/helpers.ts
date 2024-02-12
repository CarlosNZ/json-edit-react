import { CustomNodeDefinition, CustomNodeProps, NodeData } from './types'

export interface CustomNodeData {
  CustomNode?: React.FC<CustomNodeProps>
  name?: string
  customNodeProps?: Record<string, unknown>
  hideKey?: boolean
  defaultValue?: unknown
  showInTypesSelector?: boolean
  showOnEdit?: boolean
  showOnView?: boolean
  showEditTools?: boolean
}

// Fetches matching custom nodes (based on condition filter) from custom node
// definitions and return the component and its props
export const getCustomNode = (
  customNodeDefinitions: CustomNodeDefinition[] = [],
  filterProps: NodeData
): CustomNodeData => {
  const matchingDefinitions = customNodeDefinitions.filter(({ condition }) =>
    condition(filterProps)
  )
  if (matchingDefinitions.length === 0) return {}

  // Only take the first one that matches
  const {
    element,
    customNodeProps,
    hideKey = false,
    showEditTools = true,
    showOnEdit = false,
    showOnView = true,
    ...rest
  } = matchingDefinitions[0]

  return {
    CustomNode: element,
    customNodeProps,
    hideKey,
    showEditTools,
    showOnEdit,
    showOnView,
    ...rest,
  }
}
