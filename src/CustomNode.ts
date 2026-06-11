import {
  type CustomComponentProps,
  type CustomKeyProps,
  type CustomNodeDefinition,
  type CustomWrapperProps,
  type NodeData,
  type ValueData,
} from './types'

export interface CustomNodeData {
  CustomComponent?: React.FC<CustomComponentProps>
  CustomWrapperComponent?: React.FC<CustomWrapperProps>
  CustomKeyComponent?: React.FC<CustomKeyProps>
  name?: string
  componentProps?: Record<string, unknown>
  wrapperProps?: Record<string, unknown>
  showKey?: boolean
  defaultValue?: unknown
  showInTypeSelector?: boolean
  showOnEdit?: boolean
  showOnView?: boolean
  showEditTools?: boolean
  showCollectionWrapper?: boolean
  passOriginalNode?: boolean
  renderCollectionAsValue?: boolean
  toStandardType?: (value: unknown) => ValueData
  fromEditBuffer?: (
    buffer: unknown,
    nodeData: NodeData,
    componentProps?: Record<string, unknown>
  ) => unknown
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
    component,
    wrapperComponent,
    keyComponent,
    showKey = true,
    showEditTools = true,
    showOnEdit = false,
    showOnView = true,
    showCollectionWrapper = true,
    ...rest
  } = matchingDefinition

  return {
    CustomComponent: component,
    CustomWrapperComponent: wrapperComponent,
    CustomKeyComponent: keyComponent,
    showKey,
    showEditTools,
    showOnEdit,
    showOnView,
    showCollectionWrapper,
    ...rest,
  }
}
