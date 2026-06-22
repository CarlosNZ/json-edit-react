---
'json-edit-react': patch
---

Internal cleanup: remove the now-unused `previouslyEditedElement` / `recordPreviousEdit` and `tabDirection` / `setTabDirection` plumbing from the editing store. These were only ever consumed by the redirect `useLayoutEffect` retired in the previous Tab-viability work; with the redirect gone, the state was write-only and the actions had no readers. `EditingStore` shrinks to `{ open, cancel, submit, areChildrenBeingEdited }` (plus the subscribe/getSnapshot pair). No user-visible change.
