---
'@json-edit-react/themes': minor
---

The package build now supports themes that ship their own icon glyphs (`theme.icons`): a glyph's JSX `content` compiles against `react/jsx-runtime`, which is kept external (never bundled). `react` is declared as an optional peer dependency — needed only by a theme that defines icons.
