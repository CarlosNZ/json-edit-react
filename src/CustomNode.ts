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
  editOnTypeSwitch?: boolean
  showOnEdit?: boolean
  showOnView?: boolean
  showEditTools?: boolean
  showCollectionWrapper?: boolean
  passOriginalNode?: boolean
  renderCollectionAsValue?: boolean
  toStandardType?: (value: unknown) => ValueData
  fromStandardType?: (
    value: unknown,
    nodeData: NodeData,
    componentProps?: Record<string, unknown>
  ) => unknown
}

// Maps a definition to the renderable `CustomNodeData` shape, applying the
// field defaults. Serves both the committed-data condition match below and the
// "effective" data of an in-session `editOnTypeSwitch` target, where the
// definition is picked by name rather than condition.
export const buildCustomNodeData = (definition: CustomNodeDefinition): CustomNodeData => {
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
  } = definition

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

// Returns the component and props of the first definition whose `condition`
// matches
export const getCustomNode = (
  customNodeDefinitions: CustomNodeDefinition[] = [],
  nodeData: NodeData
): CustomNodeData => {
  const matchingDefinition = customNodeDefinitions.find(({ condition }) => condition(nodeData))
  return matchingDefinition ? buildCustomNodeData(matchingDefinition) : {}
}
