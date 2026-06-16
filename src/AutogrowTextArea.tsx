/**
 * This uses a cheeky hack to make the text-area input resize automatically
 * based on the content. It seemed necessary, as the text inputs (String or raw
 * JSON) could reasonably be anything from a single character to several hundred
 * lines.
 *
 * See https://css-tricks.com/the-cleanest-trick-for-autogrowing-textareas for
 * the basic idea of how it works.
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
  // value (e.g. a consumer `onChange` that strips illegal characters). React
  // then rewrites the DOM value to the transformed string, and that write
  // natively drops the caret at the END — so a mid-string edit gets yanked to
  // the end on every transformed keystroke. Remember the caret (and the length
  // it sat in) at the keystroke, then re-place it once the new value commits.
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
    // Only when React actually moved the caret (a transform changed the value);
    // the no-op skip leaves normal typing — and IME composition — untouched.
    if (el.selectionStart !== next) el.setSelectionRange(next, next)
    // `textAreaRef` is a stable ref object, so listing it for exhaustive-deps
    // adds no real re-runs (the caret only restores when `value` changes).
  }, [value, textAreaRef])

  // Adding extra (hidden) char when adding new lines to input prevents
  // mis-alignment between real value and dummy value
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
          // Only a mid-string edit can be yanked to the end, so record the
          // caret for restoration only then. Appending at the end (the common
          // case) needs nothing — an end caret stays correct through a
          // transform — so the layout effect just bails on the null.
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
