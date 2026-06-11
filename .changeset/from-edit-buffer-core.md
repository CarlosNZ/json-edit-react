---
'json-edit-react': minor
---

Add a `fromEditBuffer` field to `CustomNodeDefinition`: an optional function that transforms the edit buffer into the value to commit whenever a confirm fires with no explicit value — the ✓ button, Enter, Tab, and `editorRef.confirm()` all run the same single transform. Throwing from the hook rejects the confirm: nothing commits, the edit session stays open with the user's input intact, and the thrown message surfaces via `onError` and the inline error display (the same contract as confirming invalid JSON on a collection edit). Value nodes now show their inline error while editing, `editorRef.confirm()` no longer tears down a session whose confirm was rejected, and custom components' `setValue` accepts any `JsonData` so `renderCollectionAsValue` components can buffer object values.
