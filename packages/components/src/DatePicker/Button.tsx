import React from 'react'

// Define the props interface for the Button component
interface ButtonProps {
  color?: string
  textColor?: string
  text?: string
  onClick?: () => void
}

export const Button: React.FC<ButtonProps> = ({
  color = 'rgb(49, 130, 206)',
  textColor = 'white',
  text = 'Button',
  onClick = () => {},
}) => {
  const buttonBaseStyles: React.CSSProperties = {
    backgroundColor: color,
    color: textColor,
  }

  return (
    <button className="jer-button" style={buttonBaseStyles} onClick={onClick}>
      {text}
    </button>
  )
}
