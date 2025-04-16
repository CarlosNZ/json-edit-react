import React from 'react'
import { type CustomNodeProps } from '../_imports'

export interface UndefinedProps {
  style?: React.CSSProperties
}

export const UndefinedCustomComponent: React.FC<CustomNodeProps<UndefinedProps>> = ({
  customNodeProps = {},
}) => (
  <div style={{ fontStyle: 'italic', color: '#9b9b9b', ...customNodeProps?.style }}>undefined</div>
)
