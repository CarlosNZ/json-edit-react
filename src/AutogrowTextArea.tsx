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

interface TextAreaProps {
  className: string
  name: string
  value: string
  setValue: React.Dispatch<React.SetStateAction<string>>
  handleKeyPress: (e: React.KeyboardEvent) => void
  styles: React.CSSProperties
  textAreaRef?: React.MutableRefObject<HTMLTextAreaElement | null>
}

export const AutogrowTextArea: React.FC<TextAreaProps> = ({
  className,
  name,
  value,
  setValue,
  handleKeyPress,
  styles,
  textAreaRef,
}) => {
  // Adding extra (hidden) char when adding new lines to input prevents
  // mis-alignment between real value and dummy value
  if (typeof value !== 'string') return null
  const dummyValue = value.slice(-1) === '\n' ? value + '.' : value

  const containerHeight = document?.getElementsByClassName('jer-component')?.[0].clientHeight

  console.log('containerHeight', containerHeight)

  return (
    <div style={{ display: 'grid' }}>
      <textarea
        id={`${name}_textarea`}
        ref={textAreaRef}
        style={{
          // Prevents the textarea from growing beyond the container height,
          // which leads to a weird "double scroll" effect where both the
          // textarea and the container scroll. The 8em accounts for the difference between the container height and the text area
          maxHeight: `calc(${containerHeight}px - 8em)`,
          // maxHeight: containerHeight - 100,
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
          maxHeight: `calc(${containerHeight}px - 8em)`,
          // maxHeight: containerHeight - 100,
          height: 'auto',
          // height: heightString,
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
