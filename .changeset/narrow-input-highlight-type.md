---
'json-edit-react': patch
---

Narrowed the `inputHighlight` theme style to a plain colour string. It maps to the editor's text-selection `::selection` highlight, surfaced as a single CSS custom property, so only a static colour is ever meaningful — a style object had only its `backgroundColor` read, and a style function or array did nothing at all. If you previously passed `{ backgroundColor: '…' }`, pass the colour string directly, e.g. `inputHighlight: '#b3d8ff'`.
