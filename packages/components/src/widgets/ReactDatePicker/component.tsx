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

// react-datepicker's own stylesheet. It stays a bare side-effecting import:
// the library is external, so this survives into the bundle as an `import`
// statement for the consumer's bundler to handle, and there's no text for us
// to inline the way our own stylesheets are. That makes it the one thing in
// the package the `sideEffects: false` flag misdescribes — a bundler is
// entitled to drop a side-effect-free module, taking the import with it.
//
// It is also the one stylesheet that isn't per-component: the widgets entry
// exports `ReactSelect` and `CodeEditor` too, so a consumer of either still
// loads this CSS (~24 kB raw / ~3.3 kB gzip). Deferring it into the lazy
// chunk below would fix that and break something worse — the overrides in
// ./style.css beat the library's rules only by cascade order at equal
// specificity, so a sheet that arrives after the `useStyles` call wins.
// Per-widget sub-path entries are the way out, tracked in issue #404.
import 'react-datepicker/dist/react-datepicker.css'
// Our overrides, for better matching with Chakra-UI. Injected at first render
// (see useStyles), so they land in <head> after the import above and win on
// equal specificity.
import css from './style.css?inline'
import { useStyles } from '../../_common/useStyles'

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
  useStyles('jer-react-datepicker', css)
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
