import { type CustomNodeDefinition, type CustomNodeProps, type NodeData } from './types'

export interface CustomNodeData {
  CustomNode?: React.FC<CustomNodeProps>
  CustomWrapper?: React.FC<CustomNodeProps>
  name?: string
  customNodeProps?: Record<string, unknown>
  wrapperProps?: Record<string, unknown>
  hideKey?: boolean
  defaultValue?: unknown
  showInTypesSelector?: boolean
  showOnEdit?: boolean
  showOnView?: boolean
  showEditTools?: boolean
  showCollectionWrapper?: boolean
}

// Fetches matching custom nodes (based on condition filter) from custom node
// definitions and return the component and its props
export const getCustomNode = (
  customNodeDefinitions: CustomNodeDefinition[] = [],
  nodeData: NodeData
): CustomNodeData => {
  const matchingDefinitions = customNodeDefinitions.filter(({ condition }) => condition(nodeData))
  if (matchingDefinitions.length === 0) return {}

  // Only take the first one that matches
  const {
    element,
    wrapperElement,
    customNodeProps,
    wrapperProps,
    hideKey = false,
    showEditTools = true,
    showOnEdit = false,
    showOnView = true,
    showCollectionWrapper = true,
    ...rest
  } = matchingDefinitions[0]

  return {
    CustomNode: element,
    CustomWrapper: wrapperElement,
    customNodeProps,
    wrapperProps,
    hideKey,
    showEditTools,
    showOnEdit,
    showOnView,
    showCollectionWrapper,
    ...rest,
  }
}
