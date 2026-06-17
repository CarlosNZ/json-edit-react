---
'json-edit-react': patch
---

The two theme colours that can't be applied inline — the input-selection highlight and the copy-button glow — are now rendered as CSS custom properties on the editor container instead of being written to the document root. This scopes them per editor instance (separate themes no longer clobber one another's `--jer-highlight-color` / `--jer-icon-copy-color`), makes them reachable inside a shadow root, and applies them during SSR with no post-hydration flash. The `:root, :host` defaults in the bundled stylesheet still cover any un-themed case.
