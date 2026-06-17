---
'@json-edit-react/components': minor
---

`DatePicker` now renders its calendar UI from a swappable widget passed via `componentProps.DatePicker`, rather than bundling `react-datepicker` directly. Import the supplied `ReactDatePicker` from the `@json-edit-react/components/widgets` subpath and pass it (`datePickerDefinition({ componentProps: { DatePicker: ReactDatePicker } })`), or supply any component satisfying the exported `DatePickerWidgetProps` contract (`Date` in, `Date` out) to drop in your own picker. With no widget supplied the node falls back to editing the raw ISO string and shows a warning, so `react-datepicker` is only pulled into your bundle when you opt in.

A consumer's picker that ships its own OK/Cancel buttons keeps working: the contract surfaces `onConfirm`/`onCancel` (alongside `onChange`, which only updates the edit buffer). react-datepicker specifics (`dateFormat`, `minDate`, etc.) move onto `ReactDatePicker` and are set by wrapping it: `DatePicker: (props) => <ReactDatePicker {...props} dateFormat="dd/MM/yyyy" />`. The read-only display defaults to the locale date/time and accepts an optional `formatter: (date: Date) => string` in `componentProps`.
