---
'json-edit-react': major
---

Rework the theming engine: compose multiple style functions and tidy the theme types. The common cases — passing colours, style objects, arrays, and style functions via the `theme` prop — are unchanged.

**Style functions compose.** When an element's value is an array with more than one style function, all of them now run and merge (later wins per property) — matching what the docs always described. Previously only the last function in the array took effect. Functions are still applied after static styles.

**Types.** `ThemeStyles` is now `Partial<Record<ThemeableElement, …>>` — inherently optional per key. The compiled style map is partial too, but `getStyles` fills any gap with `{}`, so its public return contract is unchanged.

Internally the compile step is now a single pure pass with no behaviour change for existing themes. See the [migration guide](../migration-guide.md#14-theming-partial-themestyles-and-function-composition).
