---
'@json-edit-react/themes': minor
'json-edit-react': major
---

Split themes into a separate publishable package.

- New package: `@json-edit-react/themes` ships the six pre-built themes (`githubDarkTheme`, `githubLightTheme`, `monoDarkTheme`, `monoLightTheme`, `candyWrapperTheme`, `psychedelicTheme`).
- **Breaking (json-edit-react v2)**: these theme exports are no longer re-exported from `json-edit-react`. Consumers must `import { ... } from '@json-edit-react/themes'`.
- Also promoted as public API in core (additive, non-breaking among the v2 changes): `AutogrowTextArea` (joins existing `StringDisplay`, `StringEdit`, `toPathString`).
