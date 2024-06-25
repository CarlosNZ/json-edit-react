/**
 * This uses a cheeky hack to make the text-area input resize automatically
 * based on the content. It seemed necessary, as the text inputs (String or raw
 * JSON) could reasonably be anything from a single character to several hundred
 * lines.
 *
 * See https://css-tricks.com/the-cleanest-trick-for-autogrowing-textareas for
 * the basic idea of how it works.
 */

import React from 'react'
import './style.css'

interface TextAreaProps {
  className: string
  name: string
  value: string
  setValue: React.Dispatch<React.SetStateAction<string>>
  isEditing: boolean
  handleKeyPress: (e: React.KeyboardEvent) => void
  styles: React.CSSProperties
}

export const AutogrowTextArea: React.FC<TextAreaProps> = ({
  className,
  name,
  value,
  setValue,
  handleKeyPress,
  styles,
}) => {
  // Adding extra (hidden) char when adding new lines to input prevents
  // mis-alignment between real value and dummy value
  if (typeof value !== 'string') return null
  const dummyValue = value.slice(-1) === '\n' ? value + '.' : value

  return (
    <div style={{ display: 'grid' }}>
      <textarea
        id={`${name}_textarea`}
        style={{
          height: 'auto',
          gridArea: '1 / 1 / 2 / 2',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          // border: '1px solid transparent',
          ...styles,
        }}
        rows={1}
        className={className}
        name={`${name}_textarea`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        onFocus={(e) => {
          if (value.length < 40) e.target.select()
        }}
        onKeyDown={handleKeyPress}
      />
      {/* The "dummy" replica which causes the *actual* textarea to resize: */}
      <span
        className={className}
        style={{
          visibility: 'hidden',
          // visibility: 'visible',
          height: 'auto',
          gridArea: '1 / 1 / 2 / 2',
          color: 'red',
          opacity: 0.9,
          whiteSpace: 'pre-wrap',
          overflowY: 'auto',
          border: '1px solid transparent',
          ...styles,
        }}
      >
        {dummyValue}
      </span>
    </div>
  )
}
