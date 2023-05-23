/**
 * This uses a fugly hack to make the text-area resize automatically based on
 * the content, but it seemed necessary, the text inputs (String or raw JSON)
 * could have content of any size.
 *
 * See https://css-tricks.com/the-cleanest-trick-for-autogrowing-textareas for
 * the basic idea of how it works.
 *
 */

import React, { useRef } from 'react'
import './style.css'

interface TextAreaProps {
  className: string
  name: string
  value: string
  setValue: React.Dispatch<React.SetStateAction<string>>
  isEditing: boolean
  handleKeyPress: (e: React.KeyboardEvent) => void
}

export const generateUniqueId = () => `jer-${Math.ceil(Math.random() * 1000000)}`

export const AutogrowTextArea: React.FC<TextAreaProps> = ({
  className,
  name,
  value,
  setValue,
  handleKeyPress,
}) => {
  const { current: uniqueId } = useRef(generateUniqueId())

  return (
    <div style={{ display: 'grid' }}>
      <textarea
        style={{
          height: 'auto',
          gridArea: '1 / 1 / 2 / 2',
          overflowY: 'auto',
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
        id={uniqueId}
        className={className}
        style={{
          visibility: 'hidden',
          // visibility: 'visible',
          height: 'auto',
          gridArea: '1 / 1 / 2 / 2',
          color: 'red',
          opacity: 0.9,
          whiteSpace: 'pre-wrap',
          // overflowY: 'auto',
          overflow: 'clip',
          border: '1px solid transparent',
        }}
      >
        {value}
      </span>
    </div>
  )
}
