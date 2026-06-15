---
'json-edit-react': major
---

Replace the v1 `enableClipboard` prop with `showClipboardButton` (boolean, default `true`) plus the separate `onCopy` observer.

`enableClipboard` did two unrelated jobs through a `boolean | CopyFunction` overload: toggling the copy button and observing copies. These are now two single-purpose props. `showClipboardButton` is a plain display toggle — it sits in the `show*` family (`showArrayIndexes`, `showStringQuotes`, …), not the `allow*` capability gates, because hiding the copy button can't actually prevent copying (the value is selectable in the DOM); it only controls whether the convenience button renders. The copy callback moves to `onCopy?: OnCopyFunction`, which receives the same flat `NodeData` payload every other observer gets, and `CopyFunction` is removed in favour of `OnCopyFunction`. See the [migration guide](../migration-guide.md#6-enableclipboard-split-into-showclipboardbutton--oncopy).
