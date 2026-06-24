/**
 * A reference date-picker widget wrapping `react-datepicker` that satisfies the
 * `DatePickerWidgetProps` contract, so it can be passed to the `DatePicker`
 * node component (via `componentProps.DatePicker`) to provide the calendar UI.
 *
 * Parallels `ReactSelect`: the heavy third-party library is lazy-loaded and the
 * widget is fully replaceable — a consumer can supply any component satisfying
 * `DatePickerWidgetProps` instead. To configure react-datepicker specifics,
 * wrap this widget: `DatePicker: (props) => <ReactDatePicker {...props}
 * dateFormat="dd/MM/yyyy" datePickerProps={{ minDate, maxDate }} />`.
 *
 * react-datepicker fires `onChange` on every selection, so the calendar's
 * picks flow straight into the edit buffer; commit/cancel are handled by core's
 * Ok/Cancel icons and Enter/Esc. The widget therefore needs no OK/Cancel
 * buttons of its own (the contract's `onConfirm`/`onCancel` exist for pickers
 * that do ship their own).
 */

import { lazy, Suspense, type ComponentType } from 'react'
import { type DatePickerProps } from 'react-datepicker'
import { type DatePickerWidgetProps } from '../../_common/DatePickerWidget'
import { Loading } from '../../_common/Loading'

// Styles
import 'react-datepicker/dist/react-datepicker.css'
// For better matching with Chakra-UI
import './style.css'

// react-datepicker's props are a large discriminated union (selectsRange /
// selectsMultiple variants), so neither it nor a `Partial` of it accepts a
// plain merged props object — the variant discriminants conflict. Re-narrow
// the lazy component to a permissive bag for the internal wiring; the public
// surface stays typed via `ReactDatePickerExtraProps['datePickerProps']`. Same
// cast-the-lazy-component tradeoff as `ReactSelect`.
const DatePicker = lazy(() => import('react-datepicker')) as unknown as ComponentType<
  Record<string, unknown>
>

export interface ReactDatePickerExtraProps {
  // react-datepicker `dateFormat`s, applied when `showTime` is false / true
  // respectively. These format the calendar's input field, not the node's
  // read-only display (that's the node's `formatter` / `toLocaleString`).
  dateFormat?: string
  dateTimeFormat?: string
  loadingText?: string
  // Forwarded as-is to the underlying `react-datepicker` (minDate, maxDate,
  // filterDate, locale, etc.). Anything this widget owns (selected, onChange,
  // showTimeSelect, dateFormat) wins over what's passed here.
  datePickerProps?: Partial<DatePickerProps>
}

export const ReactDatePicker = ({
  value,
  onChange,
  onKeyDown,
  showTime = true,
  autoFocus,
  dateFormat = 'MMM d, yyyy',
  dateTimeFormat = 'MMM d, yyyy h:mm aa',
  loadingText = 'Loading Date Picker',
  datePickerProps,
}: DatePickerWidgetProps & ReactDatePickerExtraProps) => {
  return (
    <Suspense fallback={<Loading text={loadingText} />}>
      <DatePicker
        {...datePickerProps}
        selected={value}
        showTimeSelect={showTime}
        dateFormat={showTime ? dateTimeFormat : dateFormat}
        onChange={(date: Date | null) => onChange(date)}
        open={true}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
      />
    </Suspense>
  )
}
