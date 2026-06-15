---
'json-edit-react': major
---

The clickable icon controls — the ✓ / ✗ confirm/cancel pair and the edit/copy/delete/add icons — are now real `<button>` elements instead of `<div onClick>`, so assistive tech announces them as actionable and reads an `aria-label` (always present, independent of `showIconTooltips`). Their appearance is unchanged (the default button chrome is reset in the bundled CSS) and they carry `tabIndex={-1}`, so the editor's field-to-field Tab navigation is unaffected. Two new localisation keys (`TOOLTIP_OK`, `TOOLTIP_CANCEL`) provide the confirm/cancel labels.

Breaking only for custom CSS that targets these controls by tag name: a selector like `.jer-confirm-buttons > div` must become `.jer-confirm-buttons > button`. Wrapper-class and icon selectors are unaffected, and consumer-supplied `customButtons` remain `<div>`-wrapped.
