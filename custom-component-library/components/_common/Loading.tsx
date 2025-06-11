import React from 'react'
import './style.css'

export const Loading: React.FC<{ text?: string }> = ({ text = 'Loading' }) => {
  return <div className="jer-simple-loader">{text}...</div>
}
