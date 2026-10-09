/**
 * Renders an array of strings as a row of chips (tags, labels, aliases).
 * Hovering a chip reveals an "×" to remove it, and a "+" button adds one: as
 * free text, or, when `componentProps.options` is set, picked from that list.
 *
 * Outside an edit session each change commits on its own, via
 * `handleEdit(value)`. Inside one (the edit button, or a type switch to Chips)
 * the same controls write to the edit buffer, which ✓ commits.
 */

import React, { useState } from 'react'
import { type CustomComponentProps } from 'json-edit-react'
import css from './style.css?inline'
import { useStyles } from '../_common/useStyles'

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
  const { value, setValue, handleEdit, isEditing, canEdit, Select, componentProps } = props
  const { color = '#bae6fd', textColor = '#0c4a6e', options } = componentProps ?? {}

  const [isAdding, setIsAdding] = useState(false)

  const chips = Array.isArray(value) ? value.map(String) : []

  const update = (newChips: string[]) => (isEditing ? setValue(newChips) : handleEdit(newChips))

  const addChip = (chip: string) => {
    const text = chip.trim()
    if (text && !chips.includes(text)) update([...chips, text])
  }

  // With `options`, only the ones not already present can be added.
  const available = options?.filter((option) => !chips.includes(option))
  const canAdd = canEdit && (!available || available.length > 0)

  return (
    <div
      className="jer-chips"
      style={{ '--jer-chip-color': color, '--jer-chip-text': textColor } as React.CSSProperties}
    >
      {chips.map((chip, index) => (
        <span key={index} className="jer-chip">
          {chip}
          {canEdit && (
            <button
              type="button"
              className="jer-chip-remove"
              aria-label={`Remove ${chip}`}
              onClick={() => update(chips.filter((_, i) => i !== index))}
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
