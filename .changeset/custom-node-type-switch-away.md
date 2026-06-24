---
'json-edit-react': major
---

Fix type-switching away from a custom node mid-edit leaving an inconsistent editing UI (#335).

Switching a custom node's type to a standard one now behaves like any other deferred primitive type change: the custom component yields to the target type's standard editor, pre-filled with a conversion of the node's actual value, and the single commit happens on confirm. Previously the custom component kept rendering over the editor while the buffer was silently replaced with the `DEFAULT_STRING` placeholder (`'New data!'`), which confirm then committed verbatim.

Conversions are also safe for non-JSON sources: `null`/`undefined` → `string` yields an empty buffer (not the literal `"null"`/`"undefined"`), a `Symbol` converts to its description for `string` and to `0` for `number` (where it previously threw), and `NaN` → `number` yields `0`.

**Breaking:** the `DEFAULT_STRING` localisation key is removed — the placeholder it supplied no longer exists. Remove it from your `translations` object if present.
