---
'json-edit-react': major
---

Themes now own their icon glyphs. The standalone `icons` prop is removed; supply glyphs via `theme.icons` (keyed `add`/`edit`/`delete`/`copy`/`ok`/`cancel`/`collection`), where each value is an `IconDefinition` (`content` plus optional `viewBox`/`svgProps`/`scale`). User-supplied glyphs are themeable via `currentColor`, just like the built-ins. The expand/collapse key is renamed `chevron` → `collection`. The `IconAdd`…`IconChevron` components, `IconProps`, and `IconReplacements` are no longer exported (the built-in glyphs now live on `defaultTheme.icons`); `IconDefinition`, `ThemeIcons`, and `IconSvg` (the glyph renderer — pass an `IconDefinition`'s parts) are added.
