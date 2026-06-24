import { type KeyboardEventHandler } from 'react'

/**
 * The contract a date-picker widget must satisfy to plug into the `DatePicker`
 * node component (and any future date-flavoured component). Mirrors how core
 * exports `SelectProps` for `ReactSelect`: a node component injects whichever
 * widget the consumer passes via `componentProps.DatePicker`, so the heavy
 * third-party picker (`react-datepicker`, supplied by this package's
 * `ReactDatePicker`) is opt-in and fully replaceable.
 *
 * The contract is value-agnostic — purely `Date` in, `Date` out. The node
 * component owns parsing the stored value into a `Date` and serialising the
 * result back to its stored representation (an ISO string for `DatePicker`),
 * so a single widget can serve every date-shaped node type.
 *
 * Commit/cancel are surfaced so a self-contained picker that ships its own
 * OK/Cancel controls keeps working: those buttons map to `onConfirm`/`onCancel`
 * rather than `onChange` (which only updates the in-progress buffer). They're
 * optional because core also renders its own Ok/Cancel icons and Enter/Esc
 * still commit/cancel, so a button-less widget needs neither.
 */
export interface DatePickerWidgetProps {
  // The current value as a Date, or null when the stored value isn't a valid
  // date (the widget should render empty rather than an Invalid Date).
  value: Date | null
  // Update the in-progress edit buffer as the user picks — does NOT commit or
  // close the editor. Null signals a cleared value.
  onChange: (date: Date | null) => void
  // Commit and close the editor (for a widget with its own OK/confirm button).
  // Pass the picked Date to commit it atomically; omit it to commit whatever
  // `onChange` last buffered. Equivalent to core's Ok icon / Enter.
  onConfirm?: (date?: Date | null) => void
  // Discard the edit and close the editor (for a widget with its own Cancel
  // button). Equivalent to core's Cancel icon / Esc.
  onCancel?: () => void
  // Forward to the picker so core's Enter-to-confirm / Esc-to-cancel keeps
  // working while the widget is focused.
  onKeyDown?: KeyboardEventHandler
  // Whether to offer a time selection alongside the date.
  showTime?: boolean
  autoFocus?: boolean
}
