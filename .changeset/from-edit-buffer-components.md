---
'@json-edit-react/components': minor
---

The ✓ button, Enter, Tab and `editorRef.confirm()` now produce identical commits for every component: BigInt, Symbol, Date Object and Color Picker move their commit transforms into `fromEditBuffer` on their definitions, so the ✓ button no longer commits the raw buffer (e.g. BigInt committing a plain string, Color Picker bypassing `keepAsColor` validation). Behaviour change on invalid input: instead of silently reverting to the last valid value and closing, the editor now stays open with your text intact and shows the error inline. Enhanced Link's fields now write to the core edit buffer, fixing edits being silently discarded when confirming with ✓ (and Enter in the text field committing stale values).
