---
'@json-edit-react/components': minor
---

Pre-built custom-node definitions are exported as **definition factories**: `hyperlinkDefinition()`, `enhancedLinkDefinition()`, `datePickerDefinition()`, `dateObjectDefinition()`, `colorPickerDefinition()`, `markdownDefinition()`, `imageDefinition()`, `booleanToggleDefinition()`, `bigIntDefinition()`, `nanDefinition()`, `symbolDefinition()`, `undefinedDefinition()`.

Calling a factory with no arguments yields the standard definition. Passing overrides customizes it without losing the built-in safety condition: a `condition` override is *targeting* — ANDed with the definition's guard, so e.g. `markdownDefinition({ condition: ({ key }) => key === 'description' })` can never match a value the component can't render — `componentProps` is shallow-merged with the defaults, any other field replaces its default, and the explicit `guard` key replaces the guard itself. The override surface is typed by the exported `DefinitionOverrides<T>`.

The underlying components and their props types (`MarkdownComponent`, `DateTimePicker`, `LinkCustomComponent`, …) are exported alongside the factories, for wrapping or use in fully hand-rolled definitions.
