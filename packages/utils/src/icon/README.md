# Icon definitions from SVG — `iconFromSvg`

Turn raw SVG markup (or a React `<svg>` element) into the `IconDefinition` a theme's `icons` expects, so a copied icon drops straight into a theme. Exported from `@json-edit-react/utils`. Zero runtime dependencies.

A theme can supply its own icon glyphs through `Theme.icons`, where each glyph is an `IconDefinition` — `content` (the inner SVG markup) plus an optional `viewBox` / `svgProps` / `scale`. `iconFromSvg` builds that shape for you: it strips the outer `<svg>` tag, lifts `viewBox` and the presentation attributes (`fill`, `stroke`, `stroke-width`, …) into the right fields, and puts the inner markup in `content`. Core still renders the wrapping `<svg>`, so the glyph picks up the theme's icon colour (via `currentColor`) and standard sizing automatically.

```tsx
import { JsonEditor } from 'json-edit-react'
import { iconFromSvg } from '@json-edit-react/utils'

// Defined at module scope → built once, stable across renders.
const myTheme = {
  icons: {
    add: iconFromSvg('<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 7h-2v4H7…"/></svg>'),
  },
  styles: { iconAdd: '#2aa198' },
}

const MyEditor = () => <JsonEditor data={data} setData={setData} theme={myTheme} />
```

## Accepted forms

`iconFromSvg` is a single front door whatever the source — it accepts three forms:

- **A raw SVG string** — a full `<svg>…</svg>`, or just the inner markup (`<path>`s) on their own.
- **A React `<svg>` element** — unwrapped via its props/children (natural in `.tsx`). Routing the element through `iconFromSvg` is the right way to use JSX here: putting a full `<svg>` directly in an `IconDefinition`'s `content` would nest it inside the one core renders. A non-`<svg>` element (a `<path>`, fragment, or custom component) becomes the glyph content directly.
- **An existing `IconDefinition`** — returned unchanged.

## Inline stability

Pass a **string** for inline use — string inputs are interned, so `icons={{ add: iconFromSvg('<svg…>') }}` keeps a stable reference across renders. A React **element** or a pre-built **`IconDefinition`** (and likewise a React node placed directly in `theme.icons`) is a fresh object every render and is **not** interned: define it outside the component or wrap it in `useMemo`, exactly as you would any inline `theme` value — otherwise it churns the editor's re-render memoization. A stable `theme` reference is the general rule; the string form of `iconFromSvg` is the one case that's safe to write inline.
