---
'json-edit-react': major
---

Theme `styles` gains two row-level themeable elements — `headerRow` (a collection's header line) and `valueRow` (a leaf value's row) — so row height, background, and the like can be themed (e.g. `headerRow: { minHeight: '2em' }`). The `collectionInner` element is removed: its only distinct use — styling the children body apart from the header — is now covered by `headerRow` + `collection`. `collection`, `collectionElement`, and `dropZone` are unchanged.
