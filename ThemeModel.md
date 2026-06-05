# Theme Engine Model (WIP)

Design notes for the reworked theming engine. This supersedes the current `compileStyles` / `buildStyleObject` implementation in [src/contexts/ThemeProvider/ThemeProvider.tsx](src/contexts/ThemeProvider/ThemeProvider.tsx). Types live in [src/contexts/ThemeProvider/types.ts](src/contexts/ThemeProvider/types.ts) while we iterate; they fold back into the public type surface later.

## Goal

Give the user very granular, per-element control over styling while never forcing them to repeat themselves — define "all value text is green and bold" or "all icons are grey" once, not on every element, and still override any single element. Do this with a smaller, flatter implementation than the current one.

## Concepts

- **Element** — an individually-themeable part of the UI (`string`, `bracket`, `iconEdit`, `container`, …). The full set is `ThemeableElement`.
- **Group** — a built-in name that fans a style out onto several elements at once. `value` → `string | number | boolean | null`; `icon` → every `icon*` element. A group key is authoring sugar: it expands onto its members during compile and never survives into the compiled output.
- **Fragment** — a named, reusable style token (a colour/CSS-value string or a CSS object), referenced by name from any style value. Fragments are the user-defined, element-side complement to groups: a group says "which elements", a fragment says "what reusable value".
- **Style function** — `(nodeData) => CSSProperties | null`, evaluated per node at render time for dynamic styling. A function may be set on an element or on a group (fanned to each member).

Groups and fragments are the same idea from opposite ends: a group attaches one style to many elements (token → elements, fixed membership); a fragment attaches one named value wherever it is referenced (element → token, user membership). Multi-membership and per-property merge come for free from fragment arrays, so there is no separate user-defined-group concept.

## Precedence

Each theme in the input array is resolved **independently** — its group keys are fanned onto their member elements (group first, then specific, so a specific element key wins over a group key *within that theme*) — and the resolved themes are then merged in array order, later overlaying earlier, per element. By the time themes merge, groups no longer exist: they have washed into individual elements, so cross-theme merging is plain element-vs-element, later-wins.

For any element, contributions merge **per property** (never whole-object clobber). Statics collapse into one `base` object; functions are collected as an ordered list and composed into a single closure at compile. The merge order, low → high, is:

1. `defaultTheme`
2. per theme in array order: that theme's group statics, then its specific statics → all merged into `base`
3. per theme in array order: that theme's group functions, then its specific functions → applied on top of `base`

Two rules summarise it:

- **Specificity vs. order** — a specific element key beats a group key *within a theme*; a later theme beats an earlier theme *across the array*. The second dominates: a later theme's group tweak does override an earlier theme's specific value, because a later theme is a full override layer.
- **Kind** — functions always apply *after* statics, regardless of which theme or level they are defined at. (So a base theme's function for a property outlasts a later theme's *static* override of that property — consistent with functions-always-last.)

Functions are merged, not picked: a group function and a specific function on the same element both run, specific winning per property. Authoring an array of N functions composes the same way. There is no cap — composing N functions is the same closure as composing two.

A bare string value is resolved against `fragments` first; if it is not a fragment name it is treated as a raw CSS value applied to the element's *default property* (`color` for most, `backgroundColor` for containers / `inputHighlight`, `borderColor` for `dropZone`).

## Data stages (three structures)

1. **`ThemeInput`** — authored input. A full `Theme` (`displayName`, `fragments`, `styles`), just its `styles`, or an array of either (later entries layer over earlier).
2. **`ResolvedStyles`** — the compile-time intermediate. Each theme resolved (groups fanned onto members) and merged in array order; fragments + shorthand resolved. Per element: `{ base: CSSProperties; fns: ThemeFunction[] }`. Groups and fragments are gone. `base` is the pre-merged static object; `fns` is the ordered function list, kept as a list only because composing it into one closure is deferred to the next stage.
3. **`CompiledStyles`** — the render-time output. Per element, either a stable static object (no functions involved) or a single closure that merges the static base with each function's output. This is what `getStyles` returns directly.

## Compile algorithm (reference pseudocode)

```js
const GROUP_MEMBERS = {
  value: ['string', 'number', 'boolean', 'null'],
  icon: Object.keys(defaultTheme.styles).filter((k) => k.startsWith('icon')), // derived, not restated
}

// one layer -> a CSSProperties object OR a function (pure, no threading)
const toStyle = (layer, fragments, prop) => {
  if (typeof layer === 'function') return layer
  const v = typeof layer === 'string' ? (fragments?.[layer] ?? layer) : layer
  return typeof v === 'string' ? { [prop]: v } : v
}

const compileStyles = (themeInput, docRoot) => {
  const themes = [defaultTheme, ...(Array.isArray(themeInput) ? themeInput : [themeInput])]
    .map((t) => ('styles' in t ? t : { styles: t }))

  const base = {} // element -> merged static CSSProperties
  const fns = {} //  element -> ThemeFunction[]

  // Resolve each theme in array order; within a theme apply group keys before
  // specific keys (so specific wins within the theme). Statics merge into `base`,
  // functions append to `fns`. Cross-theme: later overlays earlier, per element —
  // groups have already washed into their members by the time themes merge.
  for (const { fragments, styles } of themes)
    for (const wantGroup of [true, false])
      for (const key in styles) {
        const isGroup = key in GROUP_MEMBERS
        if (isGroup !== wantGroup) continue
        const targets = isGroup ? GROUP_MEMBERS[key] : [key]
        const layers = Array.isArray(styles[key]) ? styles[key] : [styles[key]]
        for (const el of targets)
          for (const layer of layers) {
            const s = toStyle(layer, fragments, DEFAULT_PROP[el] ?? 'color')
            if (typeof s === 'function') (fns[el] ??= []).push(s)
            else base[el] = { ...base[el], ...s }
          }
      }

  const final = {}
  for (const el in base) {
    const b = base[el], f = fns[el]
    final[el] = f ? (nd) => f.reduce((a, fn) => ({ ...a, ...(fn(nd) || {}) }), b) : b
  }

  // CSS vars for properties that can't be set inline — unchanged
  if (typeof final.inputHighlight !== 'function' && final.inputHighlight?.backgroundColor)
    docRoot.style.setProperty('--jer-highlight-color', final.inputHighlight.backgroundColor)
  if (typeof final.iconCopy !== 'function' && final.iconCopy?.color)
    docRoot.style.setProperty('--jer-icon-copy-color', final.iconCopy.color)

  return final
}
```

Iterating themes in order, group-before-specific within each, produces the agreed precedence with no sorting and no scope tags: statics merge into `base` (specific over group within a theme; later theme over earlier across the array), functions append to `fns` in the same order, and the finalise step applies all functions on top of the merged `base`. When `fns[el]` is empty the element stays a plain object (the §16 stable-reference fast path); otherwise it is one closure.

## Constraints and gates

- **Bundle size must be strictly smaller** than the current implementation, verified by a measured before/after harness, not estimated. Levers if close: derive `value` members too, drop `displayName` handling from the hot path, inline `toStyle`.
- **Render hot path stays identical**: `getStyles` returns object-or-one-function, one overlay per node — no per-node regression versus today.
- **Behaviour parity** for everything the current engine documents, plus: groups, honest N-function composition (which fixes the README's "arrays merge" claim the current code quietly breaks).

## Decisions locked

- Built-in groups for now: `value` and `icon` only (no `collection` group — it collides with the `collection` element).
- Fragments are kept, re-pitched as named tokens / palette (not the DRY/cascade mechanism — groups are that).
- Functions merge per property; specific overlays group within a theme, later theme overlays earlier across the array; no cap on function count.
- Each theme in the input array is resolved independently (groups washed into elements) before themes merge, so cross-theme precedence is plain later-wins, not specificity-dominates.
- Functions always apply after statics (kind dominates over specificity for the static-vs-function interaction): a group function can override a specific static.
