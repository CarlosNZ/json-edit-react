import React from 'react'
import { type CustomNodeProps } from '@json-edit-react'

export interface NaNProps {
  style?: React.CSSProperties
}

export const NotANumberComponent: React.FC<CustomNodeProps<NaNProps>> = ({
  customNodeProps = {},
}) => <div style={{ color: 'rgb(220, 50, 47)', ...customNodeProps?.style }}>NaN</div>
