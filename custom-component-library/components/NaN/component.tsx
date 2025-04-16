import React from 'react'
import { type CustomNodeProps } from '@json-edit-react'

export interface NaNProps {
  style?: React.CSSProperties
}

export const NotANumberComponent: React.FC<CustomNodeProps<NaNProps>> = ({
  customNodeProps = {},
}) => <div style={{ fontStyle: 'italic', color: '#9b9b9b', ...customNodeProps?.style }}>NaN</div>
