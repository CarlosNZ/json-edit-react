---
'@json-edit-react/utils': minor
---

Add `iconFromSvg`: build a `Theme.icons` `IconDefinition` from raw SVG markup (a full `<svg>` string or bare inner markup), a React `<svg>` element (unwrapped via its props/children), or an existing `IconDefinition` (returned unchanged). String inputs are interned, so an inline `iconFromSvg('<svg…>')` keeps a stable reference across renders.
