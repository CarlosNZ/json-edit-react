import React from 'react'
import { type CustomNodeProps } from 'json-edit-react'

export const UndefinedCustomComponent: React.FC<CustomNodeProps<unknown>> = () => (
  <div style={{ fontStyle: 'italic', color: '#9b9b9b' }}>undefined</div>
)
