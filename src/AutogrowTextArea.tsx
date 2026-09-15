/**
 * A text area that resizes to fit its content, which the text inputs (string or
 * raw JSON) need — they can hold anything from a single character to several
 * hundred lines. The technique is described at
 * https://css-tricks.com/the-cleanest-trick-for-autogrowing-textareas
 *
 * TO-DO: replace with the CSS `field-sizing: content` property once browser
 * support is widespread. Branch `test/field-sizing` has an implementation.
 */

import React, { useRef } from 'react'
import { useIsomorphicLayoutEffect } from './hooks/useIsomorphicLayoutEffect'

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
  // This textarea is controlled, so `setValue` can hand back a TRANSFORMED
  // value — a consumer `onChange` that strips illegal characters, say. React
  // rewrites the DOM value to the transformed string, and that write natively
  // drops the caret at the END, yanking a mid-string edit to the end on every
  // transformed keystroke. So the caret (and the length it sat in) is recorded
  // at the keystroke and re-placed once the new value commits.
  const caretRef = useRef<{ start: number; sourceLength: number } | null>(null)
  useIsomorphicLayoutEffect(() => {
    const caret = caretRef.current
    caretRef.current = null
    const el = textAreaRef?.current
    if (!caret || !el) return
    // Shift the caret by the net length change, so a strip/insert at or before
    // it (the input-restriction norm) keeps it beside the same character.
    const target = caret.start + value.length - caret.sourceLength
    const next = Math.max(0, Math.min(target, value.length))
    // Only when React actually moved the caret, i.e. a transform changed the
    // value: the no-op skip leaves normal typing, and IME composition, alone.
    if (el.selectionStart !== next) el.setSelectionRange(next, next)
    // `textAreaRef` is a stable ref object, so listing it for exhaustive-deps
    // adds no real re-runs.
  }, [value, textAreaRef])

  // An extra hidden char on a trailing newline keeps the real and dummy values
  // aligned
  if (typeof value !== 'string') return null
  const dummyValue = value.slice(-1) === '\n' ? value + '.' : value

  return (
    <div style={{ display: 'grid' }}>
      <textarea
        id={`${name}_textarea`}
        ref={textAreaRef}
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
          // Only a mid-string edit can be yanked to the end, so the caret is
          // recorded only then. Appending at the end, the common case, needs
          // nothing, and the layout effect bails on the null.
          const { value: nativeValue, selectionStart } = e.target
          caretRef.current =
            selectionStart !== null && selectionStart < nativeValue.length
              ? { start: selectionStart, sourceLength: nativeValue.length }
              : null
          setValue(nativeValue)
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
