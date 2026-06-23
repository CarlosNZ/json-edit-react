---
'@json-edit-react/components': minor
---

Add a `UnixTimestamp` component: epoch numbers (seconds or milliseconds) rendered as a readable date, reusing the same swappable `DatePicker` widget for editing.

The guard matches numbers in a plausible epoch window (years 1990–2100, as seconds or ms) — a heuristic, so target real timestamp fields with a `condition` override (ANDed with the guard) to avoid catching unrelated numbers. The unit defaults to `'auto'` (detected from magnitude, since the seconds and millisecond ranges don't overlap) and is preserved on commit; force it with `componentProps.unit`. The read-only view defaults to `displayAs: 'number'` (the ordinary number node plus a badge, default `'UNIX'`, via `badgeLabel`); `displayAs: 'date'` shows a formatted date with an optional `formatter`. Editing uses the picker passed via `componentProps.DatePicker` (e.g. `ReactDatePicker` from `@json-edit-react/components/widgets`); with none, the standard number editor handles edits. The value stays a plain JSON number throughout.
