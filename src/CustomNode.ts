import {
  type CustomKeyProps,
  type CustomNodeDefinition,
  type CustomNodeProps,
  type NodeData,
} from './types'

export interface CustomNodeData {
  CustomNode?: React.FC<CustomNodeProps>
  CustomWrapper?: React.FC<CustomNodeProps>
  CustomKey?: React.FC<CustomKeyProps>
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
  passOriginalNode?: boolean
  renderCollectionAsValue?: boolean
}

// Fetches matching custom nodes (based on condition filter) from custom node
// definitions and return the component and its props
export const getCustomNode = (
  customNodeDefinitions: CustomNodeDefinition[] = [],
  nodeData: NodeData
): CustomNodeData => {
  const matchingDefinition = customNodeDefinitions.find(({ condition }) => condition(nodeData))
  if (!matchingDefinition) return {}

  // Only take the first one that matches
  const {
    element,
    wrapperElement,
    customKey,
    hideKey = false,
    showEditTools = true,
    showOnEdit = false,
    showOnView = true,
    showCollectionWrapper = true,
    ...rest
  } = matchingDefinition

  return {
    CustomNode: element,
    CustomWrapper: wrapperElement,
    CustomKey: customKey,
    hideKey,
    showEditTools,
    showOnEdit,
    showOnView,
    showCollectionWrapper,
    ...rest,
  }
}
