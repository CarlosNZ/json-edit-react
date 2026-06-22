/**
 * An Image display Custom Component
 */

import React from 'react'
import { type CustomComponentProps } from 'json-edit-react'

export interface ImageProps {
  imageStyles?: React.CSSProperties
  altText?: string
}

export const ImageComponent: React.FC<CustomComponentProps<ImageProps>> = (props) => {
  const { value, componentProps = {} } = props

  const { imageStyles = { maxWidth: 200, maxHeight: 200 }, altText = value as string } =
    componentProps

  return (
    <a href={value as string} target="_blank" rel="noreferrer">
      <img src={value as string} title={altText} style={imageStyles} alt={altText} />
    </a>
  )
}
