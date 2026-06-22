---
'json-edit-react': minor
---

Export the `CustomButtonDefinition` type from the package entry.

The `customButtons` prop has always been typed as `CustomButtonDefinition[]`, but the type itself wasn't exported, so TypeScript consumers couldn't import it to annotate their button definitions. It's now part of the public API.
