/**
 * An example Custom Component:
 * https://github.com/CarlosNZ/json-edit-react#custom-nodes
 *
 * Shows when an ISO date/time string is present in the JSON data, presenting a
 * date-picker interface rather than requiring the user to edit the ISO string
 * directly.
 *
 * The picker UI is a swappable widget: pass `ReactDatePicker` from
 * `@json-edit-react/components/widgets` (or any component satisfying
 * `DatePickerWidgetProps`) via `componentProps.DatePicker`. This keeps the
 * heavy `react-datepicker` dependency opt-in and lets a consumer drop in their
 * own picker. With no widget supplied the node falls back to editing the raw
 * ISO string and shows a warning.
 */

import React from 'react'
import { StringEdit, toPathString, type CustomComponentProps } from 'json-edit-react'
import { type DatePickerWidgetProps } from '../_common/DatePickerWidget'

export interface DatePickerCustomProps {
  // The picker rendered while editing. Pass `ReactDatePicker` from
  // `@json-edit-react/components/widgets`, or any component satisfying
  // `DatePickerWidgetProps`. With none supplied the node falls back to editing
  // the raw ISO string and shows `noPickerWarning`.
  DatePicker?: React.ComponentType<DatePickerWidgetProps>
  showTime?: boolean
  // Customises the read-only (non-editing) display. Defaults to
  // `date.toLocaleString()` / `toLocaleDateString()` per `showTime`.
  formatter?: (date: Date) => string
  // Inline warning shown in the fallback editor when no `DatePicker` is set.
  noPickerWarning?: React.ReactNode
}

export const DateTimePicker = (props: CustomComponentProps<DatePickerCustomProps>) => {
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
    componentProps,
  } = props

  const {
    DatePicker,
    showTime = true,
    formatter,
    noPickerWarning = 'No DatePicker component provided',
  } = componentProps ?? {}

  const date = new Date(value as string)
  const isValidDate = !isNaN(date.getTime())
  const stringStyle = getStyles('string', nodeData)

  if (isEditing) {
    // No widget supplied: fall back to editing the raw ISO string, with a
    // warning nudging the consumer to wire up a DatePicker widget.
    if (!DatePicker)
      return (
        <div>
          <StringEdit
            styles={getStyles('input', nodeData)}
            pathString={toPathString(nodeData.path)}
            {...props}
            value={value as string}
            setValue={setValue as React.Dispatch<React.SetStateAction<string>>}
          />
          <span style={{ ...stringStyle, opacity: 0.6, fontStyle: 'italic', fontSize: '0.8em' }}>
            {noPickerWarning}
          </span>
        </div>
      )

    return (
      <DatePicker
        value={isValidDate ? date : null}
        showTime={showTime}
        // A selection updates the buffer; commit/cancel come from core's
        // Ok/Cancel icons and Enter/Esc. onConfirm/onCancel are wired too, so a
        // widget shipping its own buttons works without further setup.
        onChange={(newDate) => newDate && setValue(newDate.toISOString())}
        onConfirm={(newDate) =>
          handleEdit(newDate instanceof Date ? newDate.toISOString() : undefined)
        }
        onCancel={handleCancel}
        onKeyDown={onKeyDown}
      />
    )
  }

  // View mode: a custom `formatter` wins; otherwise localised date/time. Falls
  // back to the raw value if it doesn't parse (e.g. mid type-switch).
  const displayValue = !isValidDate
    ? (value as string)
    : formatter
      ? formatter(date)
      : showTime
        ? date.toLocaleString()
        : date.toLocaleDateString()

  return (
    <div
      // Double-click to edit, like standard value nodes.
      onDoubleClick={() => canEdit && setIsEditing(true)}
      className="jer-value-string"
      style={stringStyle}
    >
      "{displayValue}"
    </div>
  )
}
