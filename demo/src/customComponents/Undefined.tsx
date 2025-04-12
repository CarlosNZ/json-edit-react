// This is not exported with the package, but here is a simple way to get
// "undefined" nodes to be editable, and the "undefined" type to appear in the
// type selector

import React from 'react'
import { CustomNodeProps, CustomNodeDefinition } from 'json-edit-react-import'

export const Undefined: React.FC<CustomNodeProps> = ({ children }) => {
  return <>{children}</>
}

// Definition for custom node behaviour
export const undefinedNodeDefinition: CustomNodeDefinition = {
  condition: ({ value }) => typeof value === 'undefined',
  element: Undefined, // the component defined above
  showOnView: false,
  showOnEdit: false,
  name: 'undefined', // shown in the Type selector menu
  showInTypesSelector: true,
  defaultValue: undefined, // when instantiated
}
