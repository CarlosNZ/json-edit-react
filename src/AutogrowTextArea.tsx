/**
 * This uses a fugly hack to make the text-area resize automatically based on
 * the content, but it seemed necessary, the text inputs (String or raw JSON)
 * could have content of any size.
 *
 * See https://css-tricks.com/the-cleanest-trick-for-autogrowing-textareas for
 * the basic idea of how it works.
 *
 */

import React, { useEffect, useRef, useState } from 'react'
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

// TO-DO Get init values from CSS Vars
const initSize: { width: number | string; height: number | string } = {
  width: '6em',
  height: '1.4em',
}

const maxHeight = 50 // em -- Add to style.css vars
const maxHeightInPx = 50 * 14.3 // TO-DO: Fetch this value

export const AutogrowTextArea: React.FC<TextAreaProps> = ({
  className,
  name,
  value,
  setValue,
  isEditing,
  handleKeyPress,
}) => {
  const [scrollDimensions, setScrollDimensions] = useState(initSize)
  const { current: uniqueId } = useRef(generateUniqueId())

  useEffect(() => {
    if (!isEditing) {
      setScrollDimensions(initSize)
      return
    }
    const el = document.getElementById(uniqueId)
    setScrollDimensions({ width: el?.scrollWidth ?? 0, height: el?.scrollHeight ?? 0 })
  }, [isEditing, value])

  const { width, height } = scrollDimensions

  return (
    <div style={{ display: 'grid' }}>
      <textarea
        style={{
          width,
          height,
          gridRow: 1,
          gridColumn: 1,
          maxHeight: `${maxHeight}em`,
          overflow: (height as number) > maxHeightInPx ? 'scroll' : 'hidden',
        }}
        className={className}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        onFocus={(e) => e.target.select()}
        onKeyDown={handleKeyPress}
      />
      {/* The "dummy" replica which causes the *actual* textarea to resize: */}
      <span
        id={uniqueId}
        className={className}
        style={{
          visibility: 'hidden',
          gridRow: 1,
          gridColumn: 1,
          height: 'auto',
          color: 'red',
          opacity: 0.9,
          whiteSpace: 'pre-wrap',
          paddingRight: '0.7em',
          maxHeight: '50em',
        }}
      >
        {value}
      </span>
    </div>
  )
}
