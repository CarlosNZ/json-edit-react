import React from 'react'
import { type CustomKeyProps } from '@json-edit-react'

export const ErrorKeyComponent: React.FC<CustomKeyProps> = ({ nodeData, styles }) => (
  <span style={{ ...styles, color: '#c0392b', fontWeight: 700 }}>
    {String(nodeData.key)}:{' '}
  </span>
)

export const PrivateKeyComponent: React.FC<CustomKeyProps> = ({ nodeData, styles }) => (
  <span style={{ ...styles, fontStyle: 'italic', opacity: 0.6 }}>
    {String(nodeData.key)}:{' '}
  </span>
)
