/**
 * An Image display Custom Component
 */

import React from 'react'
import { type CustomNodeProps } from '@json-edit-react'

export interface ImageProps {
  imageStyles?: React.CSSProperties
  altText?: string
}

export const ImageComponent: React.FC<CustomNodeProps<ImageProps>> = (props) => {
  const { value, customNodeProps = {} } = props

  const { imageStyles = { maxWidth: 200, maxHeight: 200 }, altText = value as string } =
    customNodeProps

  return (
    <a href={value as string} target="_blank" rel="noreferrer">
      <img src={value as string} title={altText} style={imageStyles} alt={altText} />
    </a>
  )
}
