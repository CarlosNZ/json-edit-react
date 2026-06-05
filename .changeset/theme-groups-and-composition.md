---
'json-edit-react': major
---

Rework the theming engine: add element **groups**, compose multiple style functions, and tidy the theme types. The common cases — passing colours, style objects, arrays, and style functions via the `theme` prop — are unchanged.

**Groups.** A theme can now style a whole category of elements with one key: `value` (covers `string`/`number`/`boolean`/`null`) and `icon` (covers every `icon…` element). A group fans its value onto each member; a specific element key still wins over a group, and the two merge per property. Purely additive.

**Style functions compose.** When an element's value is an array with more than one style function, all of them now run and merge (later wins per property) — matching what the docs always described. Previously only the last function in the array took effect. Functions are still applied after static styles.

**Types.** `ThemeStyles` is now `Partial<Record<ThemeableElement | ThemeableGroup, …>>` — inherently optional per key, and it accepts group keys. The compiled style map is partial too, but `getStyles` fills any gap with `{}`, so its public return contract is unchanged.

Internally the compile step is now a single pure pass with no behaviour change for existing themes. See the [migration guide](../migration-guide.md#14-theming-groups-partial-themestyles-and-function-composition).
