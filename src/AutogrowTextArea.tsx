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
import { useTheme } from './theme'

interface TextAreaProps {
  className: string
  name: string
  value: string
  setValue: React.Dispatch<React.SetStateAction<string>>
  isEditing: boolean
  handleKeyPress: (e: React.KeyboardEvent) => void
}

export const AutogrowTextArea: React.FC<TextAreaProps> = ({
  className,
  name,
  value,
  setValue,
  handleKeyPress,
}) => {
  const { styles } = useTheme()
  // Adding extra (hidden) char when adding new lines to input prevents
  // mis-alignment between real value and dummy value
  const dummyValue = value.slice(-1) === '\n' ? value + '.' : value

  return (
    <div style={{ display: 'grid' }}>
      <textarea
        style={{
          height: 'auto',
          gridArea: '1 / 1 / 2 / 2',
          overflowY: 'auto',
          ...styles.input,
        }}
        rows={1}
        className={className}
        name={name}
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
          overflow: 'clip',
          border: '1px solid transparent',
          ...styles.input,
        }}
      >
        {dummyValue}
      </span>
    </div>
  )
}
