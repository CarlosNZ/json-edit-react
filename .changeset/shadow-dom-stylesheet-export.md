---
'json-edit-react': minor
---

Add a standalone stylesheet export for Shadow DOM / manual style injection.

The base stylesheet is still inlined and injected into the document `<head>` automatically, so the zero-config case is unchanged. It is now *also* published as a standalone file, importable via the `json-edit-react/style.css` subpath export, for consumers who need to inject the styles themselves — most notably inside a Shadow DOM, where styles injected into the document `<head>` can't cross the shadow boundary. The stylesheet's custom properties are now defined on both `:root` and `:host` so they resolve correctly in either context. Resolves [#225](https://github.com/CarlosNZ/json-edit-react/issues/225).
