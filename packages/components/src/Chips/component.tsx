/**
 * Renders an array of strings as a row of chips (tags, labels, aliases).
 * Hovering a chip reveals an "×" to remove it, and a "+" button adds one: as
 * free text, or, when `componentProps.options` is set, picked from that list.
 *
 * Each change commits on its own, via `handleEdit(value)`, so the chips need
 * no edit session. The one the edit button opens is for the Type selector, so
 * the chips are read-only while it's open. A type switch to Chips commits as
 * soon as it renders.
 */

import React, { useEffect, useRef, useState } from 'react'
import { type CustomComponentProps } from 'json-edit-react'
import css from './style.css?inline'
import { useStyles } from '../_common/useStyles'
import { isStringArray } from './isStringArray'

export interface ChipsCustomProps {
  // Chip background. Default sky blue.
  color?: string
  // Chip text. Default dark blue.
  textColor?: string
  // Restricts new chips to these values, picked from a dropdown rather than
  // typed as free text.
  options?: string[]
}

export const Chips = (props: CustomComponentProps<ChipsCustomProps>) => {
  useStyles('jer-chips', css)
  const { value, handleEdit, isEditing, canEdit, Select, nodeData, componentProps } = props
  const { color = '#bae6fd', textColor = '#0c4a6e', options } = componentProps ?? {}

  const [isAdding, setIsAdding] = useState(false)

  // An edit session whose committed value isn't yet a string array is a type
  // switch to Chips, already converted into the buffer. With nothing left to
  // confirm, it commits straight away. A session opened from the edit button
  // stays open, as it's where the Type selector lives. The ref stops a second
  // commit when Strict Mode runs the effect twice.
  const switchCommitted = useRef(false)
  useEffect(() => {
    if (!isEditing || isStringArray(nodeData.value) || switchCommitted.current) return
    switchCommitted.current = true
    handleEdit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

  const chips = Array.isArray(value) ? value.map(String) : []

  // Read-only during an edit session, as well as on a node `allowEdit` blocks.
  const isEditable = canEdit && !isEditing

  const addChip = (chip: string) => {
    const text = chip.trim()
    if (text && !chips.includes(text)) handleEdit([...chips, text])
  }

  // With `options`, only the ones not already present can be added.
  const available = options?.filter((option) => !chips.includes(option))
  const canAdd = isEditable && (!available || available.length > 0)

  return (
    <div
      className="jer-chips"
      style={{ '--jer-chip-color': color, '--jer-chip-text': textColor } as React.CSSProperties}
    >
      {chips.map((chip, index) => (
        <span key={index} className="jer-chip">
          {chip}
          {isEditable && (
            <button
              type="button"
              className="jer-chip-remove"
              aria-label={`Remove ${chip}`}
              onClick={() => handleEdit(chips.filter((_, i) => i !== index))}
            >
              <svg viewBox="0 0 10 10" width="0.6em" height="0.6em">
                <path
                  d="M2.5 2.5l5 5M7.5 2.5l-5 5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </span>
      ))}
      {canAdd &&
        (!isAdding ? (
          <button
            type="button"
            className="jer-chip-add"
            aria-label="Add chip"
            onClick={() => setIsAdding(true)}
          >
            <svg viewBox="0 0 10 10" width="0.7em" height="0.7em">
              <path
                d="M5 1.5v7M1.5 5h7"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : available ? (
          <span onBlur={() => setIsAdding(false)}>
            <Select
              options={available}
              defaultValue=""
              placeholder="Add…"
              autoFocus
              onChange={(option) => {
                addChip(option)
                setIsAdding(false)
              }}
              onKeyDown={(e) => e.key === 'Escape' && setIsAdding(false)}
            />
          </span>
        ) : (
          <input
            className="jer-chip-input"
            placeholder="Add…"
            autoFocus
            onBlur={() => setIsAdding(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsAdding(false)
              if (e.key !== 'Enter') return
              // Enter adds and clears, ready for the next chip; on an empty
              // input it closes.
              if (!e.currentTarget.value.trim()) setIsAdding(false)
              addChip(e.currentTarget.value)
              e.currentTarget.value = ''
            }}
          />
        ))}
    </div>
  )
}
