/**
 * This uses a cheeky hack to make the text-area input resize automatically
 * based on the content. It seemed necessary, as the text inputs (String or raw
 * JSON) could reasonably be anything from a single character to several hundred
 * lines.
 *
 * See https://css-tricks.com/the-cleanest-trick-for-autogrowing-textareas for
 * the basic idea of how it works.
 */

import React, { useCallback, useRef } from 'react'

interface TextAreaProps {
  className: string
  name: string
  value: string
  setValue: React.Dispatch<React.SetStateAction<string>>
  onKeyDown: (e: React.KeyboardEvent) => void
  styles: React.CSSProperties
  textAreaRef?: React.MutableRefObject<HTMLTextAreaElement | null>
}

export const AutogrowTextArea: React.FC<TextAreaProps> = ({
  className,
  name,
  value,
  setValue,
  onKeyDown,
  styles,
  textAreaRef,
}) => {
  // Own ref to the textarea (also forwarded to the optional `textAreaRef`), so
  // the caret-restore below can reach the element regardless of the caller.
  const innerRef = useRef<HTMLTextAreaElement | null>(null)
  const setRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      innerRef.current = el
      if (textAreaRef) textAreaRef.current = el
    },
    [textAreaRef]
  )

  // Restore the caret after a keystroke that the consumer's `onChange` rejects
  // or rewrites. This is a CONTROLLED textarea, so when the settled `value`
  // differs from what was typed (e.g. a disallowed character was stripped),
  // React resets the DOM value to match the prop — and the browser drops the
  // caret to the END. A microtask runs after React's synchronous
  // controlled-state restore (which is what moves the caret) but before paint,
  // so the corrected caret never flashes. Reading the SETTLED `el.value` rather
  // than the captured keystroke covers a full rejection too (where the value
  // is unchanged, so no re-render fires — an effect wouldn't run at all).
  const restoreCaret = (el: HTMLTextAreaElement, caret: number, typed: string) => {
    queueMicrotask(() => {
      if (innerRef.current !== el) return // editor closed / element replaced
      const settled = el.value
      if (settled === typed) return // accepted as typed → browser caret is fine
      // Shift the caret back by however many characters were dropped (negative
      // if the transform inserted), keeping it where the user was typing.
      const next = Math.max(0, Math.min(caret - (typed.length - settled.length), settled.length))
      el.setSelectionRange(next, next)
    })
  }

  // Adding extra (hidden) char when adding new lines to input prevents
  // mis-alignment between real value and dummy value
  if (typeof value !== 'string') return null
  const dummyValue = value.slice(-1) === '\n' ? value + '.' : value

  return (
    <div style={{ display: 'grid' }}>
      <textarea
        id={`${name}_textarea`}
        ref={setRef}
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
        onChange={(e) => {
          restoreCaret(e.target, e.target.selectionStart ?? 0, e.target.value)
          setValue(e.target.value)
        }}
        autoFocus
        onFocus={(e) => {
          if (value.length < 40) e.target.select()
        }}
        onKeyDown={onKeyDown}
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
