/**
 * Renders Unix-epoch numbers (seconds or milliseconds) as a readable date.
 *
 * Editing reuses the same swappable picker as `DatePicker`: pass `ReactDatePicker`
 * (or any `DatePickerWidgetProps` component) via `componentProps.DatePicker`.
 * The definition enables editing-mode rendering only when a widget is supplied;
 * with none, the node's standard number editor handles edits (see
 * `definition.ts`).
 *
 * The read-only view has two modes (`componentProps.displayAs`):
 *   - `'number'` (default): the standard number node (`originalNode`) plus a
 *     small badge (default "UNIX") marking it as a timestamp — uses the
 *     `ErrorIndicator` decorator pattern.
 *   - `'date'`: a formatted date (locale, or a custom `formatter`).
 */

import React from 'react'
import { type CustomComponentProps } from 'json-edit-react'
import { type DatePickerWidgetProps } from '../_common/DatePickerWidget'
import { epochToDate, dateToEpoch, type UnixTimeUnit } from './epoch'
import './style.css'

export interface UnixTimestampCustomProps {
  // The picker rendered while editing. The definition enables edit rendering
  // only when this is supplied; otherwise core's standard number editor edits.
  DatePicker?: React.ComponentType<DatePickerWidgetProps>
  showTime?: boolean
  // Whether stored values are epoch seconds or milliseconds. `'auto'` (default)
  // detects per value from its magnitude.
  unit?: UnixTimeUnit
  // Read-only display mode. `'number'` (default) shows the raw number with a
  // badge; `'date'` shows a formatted date.
  displayAs?: 'date' | 'number'
  // Badge text for the `'number'` display mode. Default `'UNIX'`.
  badgeLabel?: React.ReactNode
  // Customises the `'date'` display. Defaults to locale date/time per showTime.
  formatter?: (date: Date) => string
}

export const UnixTimestamp = (props: CustomComponentProps<UnixTimestampCustomProps>) => {
  const {
    value,
    setValue,
    handleEdit,
    handleCancel,
    onKeyDown,
    isEditing,
    setIsEditing,
    getStyles,
    nodeData,
    canEdit,
    originalNode,
    componentProps,
  } = props

  const {
    DatePicker,
    showTime = true,
    unit = 'auto',
    displayAs = 'number',
    badgeLabel = 'UNIX',
    formatter,
  } = componentProps ?? {}

  const numericValue = typeof value === 'number' ? value : Number(value)

  // Editing only reaches this component when a widget is supplied (the
  // definition sets `showOnEdit` accordingly); without one, core's number
  // editor handles edits and this branch never runs.
  if (isEditing && DatePicker) {
    const date = epochToDate(numericValue, unit)
    return (
      <DatePicker
        value={isNaN(date.getTime()) ? null : date}
        showTime={showTime}
        onChange={(newDate) => newDate && setValue(dateToEpoch(newDate, unit, numericValue))}
        onConfirm={(newDate) =>
          handleEdit(newDate instanceof Date ? dateToEpoch(newDate, unit, numericValue) : undefined)
        }
        onCancel={handleCancel}
        onKeyDown={onKeyDown}
      />
    )
  }

  // View mode — `'number'`: the standard number node plus a UNIX badge.
  if (displayAs === 'number')
    return (
      <span
        className="jer-unix-timestamp-wrapper"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em' }}
      >
        {originalNode}
        <span className="jer-unix-badge">{badgeLabel}</span>
      </span>
    )

  // View mode — `'date'`: a formatted date (raw value if it doesn't parse).
  const date = epochToDate(numericValue, unit)
  const isValidDate = !isNaN(date.getTime())
  const displayValue = !isValidDate
    ? String(value)
    : formatter
      ? formatter(date)
      : showTime
        ? date.toLocaleString()
        : date.toLocaleDateString()

  return (
    <div
      // Double-click to edit, like standard value nodes (enters the widget when
      // supplied, else core's number editor).
      onDoubleClick={() => canEdit && setIsEditing(true)}
      className="jer-value-string"
      style={getStyles('string', nodeData)}
    >
      {displayValue}
    </div>
  )
}
