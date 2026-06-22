---
'json-edit-react': patch
---

Tab navigation now skips filtered-out and non-editable nodes up front instead of opening them and bouncing reactively. The redirect `useLayoutEffect` in `ValueNodeWrapper` that previously fired transient `startEdit` / `cancelEdit` observer events on dead-end nodes is gone — `onEditEvent` consumers no longer see those spurious pairs.

The change is in `getNextOrPrevious`, which gains an optional 5th `isViable?: (nodeData) => boolean` predicate. `useCommon` composes the predicate from the precomputed `filterState.visiblePaths` Set and the existing `allowEditFilter`, and threads it through. Tab navigation from both value edits and key edits (via `KeyDisplay`) now benefits.

Behaviour change worth noting: when no viable Tab target exists, the editor cancels cleanly. The previous "fall back to `previouslyEditedElement`" hop is gone.

When live search hides the actively-edited node, the input now unmounts cleanly and the editing record sits inactive in the store; clearing the search later resumes the edit. No off-screen commit footgun because there's no input element to commit through.
