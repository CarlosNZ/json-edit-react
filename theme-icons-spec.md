# Theme icons — v2 spec

Status: design, pre-implementation. A v2 breaking redesign — not constrained by the current implementation.

## Motivation

Icons are a significant part of a theme's "look", but today they aren't subsumed into a theme at all. The `icons` prop replaces icon glyphs per-instance, while themes only control icon *styling* (colour/size) via `styles.iconAdd`, `styles.iconEdit`, etc. This splits one visual concern across two unrelated surfaces. In v2, themes own their icon glyphs as well as their styling, and the standalone `icons` prop goes away.

## Core concepts

Two orthogonal concerns, kept in separate fields:

- **Glyph** — *which* icon shape renders. Owned by `Theme.icons` (new).
- **Paint** — *how* it's coloured/sized. Owned by `Theme.styles` under `iconAdd`…`iconCollection` (unchanged).

You can restyle the default glyph (set `styles.iconAdd`), swap the glyph (`icons.add`), or both. Keeping them in separate fields makes that orthogonality explicit and keeps `styles` homogeneous — every entry stays "CSS for a themeable element", so the compile/merge step never has to special-case icon keys.

### Why a "data" glyph format, not a full element

Core renders the wrapping `<svg>` itself, rather than accepting a pre-built `<svg>` element. This is what lets core normalise size and inject the themed colour with no `cloneElement` and no wrapper gymnastics. The user supplies only what goes *inside* the `<svg>`, plus the couple of attributes core can't infer (`viewBox`, and for stroke icons the presentation attributes). This format already exists internally — the built-in `IconSvg` wrapper in [src/Icons.tsx](src/Icons.tsx) is exactly it; v2 just exposes that shape.

### Naming invariant

The glyph key and its paint key follow one mechanical rule, no exceptions:

> **styles key = `icon` + PascalCase(glyph key)**

| Glyph (`icons`) | Paint (`styles`) |
| --- | --- |
| `add` | `iconAdd` |
| `edit` | `iconEdit` |
| `delete` | `iconDelete` |
| `copy` | `iconCopy` |
| `ok` | `iconOk` |
| `cancel` | `iconCancel` |
| `collection` | `iconCollection` |

The expand/collapse glyph is keyed `collection`, not `chevron` — it's named after its *function*, since a user-supplied glyph need not be a chevron at all. This also removes the only cross-name (`chevron` ↔ `iconCollection`) that broke the invariant.

## Types ([src/types.ts](src/types.ts))

```ts
/** A themeable icon glyph. Core renders the wrapping <svg> itself, so it can
 *  normalise size and apply the theme's icon styling. Supply only what goes
 *  inside the <svg>, plus the attributes core can't infer. */
export interface IconDefinition {
  /** Inner SVG markup — <path>/<circle>/<g>… pasted from a source icon, minus
   *  its outer <svg> tag. */
  content: React.ReactNode
  /** From the source <svg>. Defaults to '0 0 24 24' (by far the most common). */
  viewBox?: string
  /** Pass-through <svg> attributes — only needed for stroke-based icons
   *  (Lucide/Feather/…): { fill: 'none', stroke: 'currentColor', strokeWidth: 2 }.
   *  Colour flows in from the theme via currentColor; don't set size here —
   *  use `scale` (below). */
  svgProps?: React.SVGProps<SVGSVGElement>
  /** Per-glyph size correction, multiplied onto the core size baseline
   *  (ICON_TEXT_SIZE_RATIO, see "How icon sizing works"). Default 1 = the
   *  standard icon size, so a normal full-bleed glyph needs no `scale` at all.
   *  This is OUR field — NOT the CSS `scale` property or an SVG `transform`;
   *  core reads it to compute the rendered em size and it never reaches the
   *  DOM. Use it only to compensate for a glyph whose artwork under/over-fills
   *  its viewBox relative to the rest of the set: e.g. `scale: 1.3` renders
   *  30% bigger. */
  scale?: number
}

/** A theme's icon glyphs. Keyed by the bare icon name; the matching paint lives
 *  in `styles` under `icon` + PascalCase (e.g. `collection` ↔ `iconCollection`). */
export interface ThemeIcons {
  add?: IconDefinition
  edit?: IconDefinition
  delete?: IconDefinition
  copy?: IconDefinition
  ok?: IconDefinition
  cancel?: IconDefinition
  collection?: IconDefinition
}
```

`IconReplacements` (was `Record<name, JSX.Element>`) is **removed**; `ThemeIcons` replaces it.

### Theme shape ([types.ts:718](src/types.ts#L718))

```ts
export interface Theme {
  displayName?: string
  fragments?: ThemeFragments
  icons?: ThemeIcons        // NEW — glyphs
  styles: ThemeStyles       // paint, incl. iconAdd…iconCollection (unchanged)
}
```

`icons` merges across a `ThemeInput` array per-key, later theme wins — exactly parallel to how `styles` already compose.

`icons` is also **required to be complete on `defaultTheme`**: the seven built-in glyphs are authored as `IconDefinition`s on `defaultTheme.icons`, each carrying its own `scale` correction (`delete` ≈ 1.04, `copy` ≈ 0.86, `ok` ≈ 0.9, `cancel` ≈ 1.3, `collection` ≈ 0.7 — tuned to today's look). Since `defaultTheme` is always merge layer 0, the merged `icons` a node sees is always fully populated, which is what lets the renderer drop its per-name fallback (see Rendering). User themes need only define the glyphs they want to *replace*. The standalone `IconAdd`…`IconChevron` components are absorbed into these definitions — their inner markup becomes the `content` of the corresponding `defaultTheme.icons` entry; the wrapper components themselves are no longer part of the render path.

### `JsonEditorProps` ([types.ts:18](src/types.ts#L18))

```ts
-  icons?: IconReplacements   // REMOVED
```

The per-instance override is now theme-array layering, the same mechanism used for style overrides:

```tsx
theme={[githubDark, { icons: { add: iconFromSvg('<svg…>') } }]}
```

This unifies composition — styles, fragments, and icons all layer through the same `ThemeInput` array, with precedence equal to explicit array order. The standalone `icons` prop would be the odd one out, and anything it could express now moves to `theme.icons` with no other change.

## Authoring workflow

**Fill icon** (most icons — reactsvgicons / Boxicons / Material). Keep the inner paths and the `viewBox`:

```ts
add: {
  viewBox: '0 0 24 24',
  content: <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4z" />,
}
```

**Stroke icon** (Lucide / Feather / Heroicons-outline). Same, but the `fill`/`stroke` attributes that lived on the source `<svg>` move into `svgProps`:

```ts
ok: {
  content: (
    <>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <path d="M22 4L12 14.01l-3-3" />
    </>
  ),
  svgProps: {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
}
```

The only "hoops" are: strip the outer `<svg …>` tag, copy the `viewBox` string, and for stroke icons move the presentation attrs into `svgProps`. The `iconFromSvg` utility (below) removes even these.

## Rendering ([src/Icons.tsx](src/Icons.tsx))

The built-in glyphs live in `defaultTheme.icons` (see below), which is always layer 0 of the merged theme — so `icons` is **always fully populated** and there is no separate "built-in fallback component" path. Every icon, default or user-supplied, renders through the same `IconSvg` + `getStyles('iconX')` route, so user glyphs are themeable like the built-ins (today's `icons?.add ?? …` short-circuit, which bypasses styling for user glyphs, is gone).

Because the glyph key and its paint key follow the naming invariant (`styles key = icon + PascalCase(glyph key)`), the whole per-name `switch` collapses to a single derivation — no case list, no fallback:

```tsx
const ICON_TEXT_SIZE_RATIO = 1.4   // icon:text ratio — see "How icon sizing works"

const { getStyles, icons } = useTheme()   // merged ThemeIcons — always complete

const Icon = ({ name, nodeData }: { name: keyof ThemeIcons; nodeData: NodeData }) => {
  const def = icons[name]                                 // guaranteed present
  const styleKey = `icon${capitalise(name)}` as ThemeableElement   // the invariant
  const style = getStyles(styleKey, nodeData)             // pure colour — no size
  return (
    <IconSvg
      viewBox={def.viewBox ?? '0 0 24 24'}
      {...def.svgProps}
      size={`${ICON_TEXT_SIZE_RATIO * (def.scale ?? 1)}em`}   // ratio × per-glyph
      className="jer-icon"
      style={style}
    >
      {def.content}
    </IconSvg>
  )
}
```

So the naming invariant isn't just documentation — it's what lets the renderer drop the hand-written `switch` entirely. (`collection` → `iconCollection` falls out of the same rule; the old `chevron` cross-name was the only thing that previously blocked this.)

Note what changed versus today's switch: there are **no per-name size constants** (`1.45em`, `1.2em`, the `90%`/`130%` font-size nudges) baked into the render path and **no per-name component branches**. The single `ICON_TEXT_SIZE_RATIO` carries the icon:text ratio, the only per-glyph size input is `def.scale`, and `defaultTheme`'s icon styles carry **colour only — no `fontSize`**. The built-in glyphs' historical corrections move *out* of the switch and *into* their `defaultTheme.icons` `scale` values — so a user-supplied glyph is never silently resized by a tweak that was tuned for a built-in.

### How icon sizing works

There is no SVG-intrinsic icon size; the only natural anchor is the ambient font-size. `.jer-editor-container` sets `font-size: 16px` ([style.css:89](src/style.css#L89)), the button wrappers use `font: inherit` ([style.css:368](src/style.css#L368) — flagged "load-bearing — the icons are sized in `em`"), so an icon's `em` resolves against the editor's font-size. `1em` renders the icon at exactly text height.

Two facts that surprise people:

- **`viewBox` does not set rendered size.** `width`/`height` (the `em`) do. `viewBox` only declares the internal coordinate space, which is scaled to *fit* that box (`preserveAspectRatio` defaults to fit-and-centre). A `0 0 24 24` glyph and a `0 0 512 512` glyph both fill the same em box. Changing the default `viewBox` would not globally scale anything — leave the path coords alone and you *clip*; scale them to match and you see *no change*. The only global size levers are the `em` and the inherited font-size.
- **The per-glyph corrections aren't a `viewBox` artefact.** They compensate for *source art*: the built-ins come from different icon sets (Boxicons, Lucide, Feather, Typicons, FontAwesome) that draw with different padding inside their viewBox and different stroke weight, so at an identical em box they look different sizes.

That separates size into two clean inputs — and crucially neither lives in `styles`, so the [opt-out](#opting-out-of-a-themes-icons) scenario can't carry a stale size tweak:

1. **Policy — `ICON_TEXT_SIZE_RATIO` (core constant, `1.4`).** The icon:text ratio: icons read better a bit larger than body text, so the standard icon is `1.4em` (~22px at the 16px base). One global number, not a `viewBox` or theme-style value. To scale *all* icons, change the ambient font-size (the editor's `font-size`); everything em-sized follows.
2. **Per-glyph correction — `IconDefinition.scale` (default 1).** Multiplied onto the baseline: `size = ICON_TEXT_SIZE_RATIO × (scale ?? 1)` em. `1` = the standard size, so a well-drawn full-bleed glyph needs no `scale`. The built-ins carry small corrections only because their source art under/over-fills its viewBox.

Keeping the two apart is the point: a user dropping in a normal icon sets no `scale`, gets `1.4em`, and it matches the surrounding icons — because the policy already handled the icon:text ratio. Folding the `1.4` into each `scale` instead would force every user glyph to re-supply the policy (`scale: 1.4`) just to look normal.

So the two "size" surfaces never compete: `scale` is **per-glyph and intrinsic** (a dedicated `size` prop), `styles.*.fontSize` is **global and thematic** (the slot, carried in the merged `style` object). One sets the `em`, the other sets what `1em` resolves to — they multiply rather than overwrite.

## Override semantics

Falls out of `currentColor` — no extra mechanism:

- **Themeable glyph** → leave fills as `currentColor` (the `IconSvg` default). The composed `iconAdd`/`iconCollection`/… colour flows in via theme array order, like any style.
- **Fixed-colour glyph** → hardcode the fill in `content` (`<path fill="#f00" …/>`). A child's own `fill` isn't touched by the colour the theme sets on the parent `<svg>`, so there's no need to also add an icon-style entry to "protect" it.

This is per-*path*, not per-icon: a multi-colour glyph (flag, brand logo) survives theming as long as **every coloured path carries its own explicit `fill`**. A path that omits `fill` inherits the parent `<svg>`'s `currentColor` and *will* get repainted — so the protection comes from the explicit `fill`, not from the icon "being a brand icon". Real-world brand/flag SVGs almost always set explicit fills on every shape, so this is rarely a problem in practice.

So array order still decides *what colour* a theme offers; the glyph's own content decides whether it *adopts* that colour — per-path, no extra style prop.

## Opting out of a theme's icons

A user may want a preset theme's *styling* but not its *glyphs* (keep the defaults). Layering can't express this: later array entries only add or override keys, they can't *clear* one — so `theme={[githubDark, { icons: {} }]}` keeps `githubDark`'s glyphs, because for each key its definition is still the last one that set it. The way to opt out is to **not bring them in** — omit the field before passing the theme:

```tsx
const { icons, ...rest } = githubDark
<JsonEditor theme={rest} … />
```

`rest` carries `githubDark`'s `styles` and `fragments` but no `icons`, so the merged glyphs fall back to `defaultTheme`'s (always layer 0). This clean omission is only possible *because* `icons` is its own top-level field — if glyphs lived inside `styles`, you couldn't drop them without also dropping the icon colours.

**No sizing consequence.** Because size lives entirely in the glyph (`ICON_TEXT_SIZE_RATIO × scale`) and never in `styles`, dropping a theme's icons takes its `scale` corrections with it and the default glyphs bring their own. The theme's *icon colour* (`styles.iconX`) still applies to the default glyphs — usually what you want, since they're `currentColor`. (This is the payoff of moving the `1.4` out of theme styles: under the earlier `fontSize`-in-styles model, a theme that had tuned its slot size would have mis-sized the default glyphs here.)

If we later want per-icon opt-out via layering, it'd need an explicit reset sentinel (e.g. `icons: { add: null }` → "back to default"). Not in scope; the whole-theme case is covered by the destructure.

## `iconFromSvg` utility ([@json-edit-react/utils](packages/utils/))

Lets a user paste raw SVG markup verbatim instead of hand-authoring an `IconDefinition`. Lives in utils (opt-in sugar) so core stays zero-dep.

```ts
export function iconFromSvg(svg: string | IconDefinition): IconDefinition
```

```ts
import { iconFromSvg } from '@json-edit-react/utils'

const theme = {
  icons: {
    add: iconFromSvg('<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 7h-2v4H7…"/></svg>'),
  },
}
```

Behaviour:

- **String** (the headline case): regex-extract the outer-tag attributes → `viewBox` + `svgProps`, and drop the inner markup into `content` via `<g dangerouslySetInnerHTML={{ __html: inner }} />`. Core still owns the `<svg>`, so size + theme colour work as for hand-authored definitions. `dangerouslySetInnerHTML` is benign here — the markup is author-supplied, not user input.
- **`IconDefinition` passthrough**: returned as-is, so `iconFromSvg` is the single front door regardless of source. No scope creep beyond string → `IconDefinition`.
- **Isomorphic**: regex extraction (not `DOMParser`) keeps it SSR-safe, since this is a render-path artefact.
- **Interned by input string**: identical markup returns the same object reference, so an inline `icons: { add: iconFromSvg(code) }` doesn't defeat theme/node memoization (see [dev-docs/PERF-ARCHITECTURE.md](dev-docs/PERF-ARCHITECTURE.md)). Reuses the filter-kit interning approach.

## Knock-on changes

- **Migration guide** — what a v1 user must act on: `icons` prop removed → move config to `theme.icons`; each value changes from a `JSX.Element` to an `IconDefinition` (or wrap with `iconFromSvg`); `chevron` → `collection`.
- **README** — drop the `icons` prop row; document `Theme.icons`, `IconDefinition`, and the `currentColor` theming rule (present tense).
- **`defaultTheme`** ([src/contexts/ThemeProvider/defaultTheme.ts](src/contexts/ThemeProvider/defaultTheme.ts)) — gains a complete `icons: ThemeIcons`, one `IconDefinition` per built-in glyph (inner markup from the old `Icon*` components, each with its tuned `scale`). The `iconAdd`…`iconCollection` **style** entries stay **colour-only — no `fontSize`** (the icon:text ratio is core's `ICON_TEXT_SIZE_RATIO`, not a theme-style value). Because the definitions carry JSX `content`, the file emits JSX — it becomes `.tsx` (or imports the glyph content from a `.tsx` sibling). Core's rollup already handles TSX, so no build change for core.
- **`Icons.tsx`** ([src/Icons.tsx](src/Icons.tsx)) — the per-name `switch` and the seven `Icon*` wrapper components are removed; what remains is `IconSvg` plus the small invariant-driven `Icon` renderer (`icon` + PascalCase derivation). `IconSvg` keeps its current shape — it *is* the `IconDefinition` renderer.
- **Themes package build** — a theme that defines `icons` emits JSX → the package gains `react/jsx-runtime` (React is already a peer dep there). Not a new category, since themes already carry `StyleFunction` code, but the rollup config needs TSX handling.
- **`ThemeProvider`** ([src/contexts/ThemeProvider/ThemeProvider.tsx](src/contexts/ThemeProvider/ThemeProvider.tsx)) — `icons` now sourced from the merged theme rather than a separate prop; `EMPTY_ICONS` / `IconReplacements` references updated. The merged `icons` is exposed via `useTheme()` alongside `getStyles`.
- **Tests** — icon-replacement tests move from the prop to `theme.icons`; add coverage for `iconFromSvg` (string parse, interning stability), a themed `currentColor` glyph picking up the theme colour, a fixed-`fill` glyph resisting it, and a `scale` override changing rendered size.
- **`src/index.ts`** — drop the `IconReplacements` export; add `IconDefinition` and `ThemeIcons`.

## Resolved decisions

- **`ThemeIcons`** is the name that replaces `IconReplacements`. ✔
- **The built-in glyphs move into `defaultTheme.icons`** as `IconDefinition`s, each carrying its tuned `scale`. They are *not* kept as fallback components — `defaultTheme` being merge layer 0 makes the merged `icons` always complete, so the renderer needs no fallback path and the per-name `switch` collapses to the naming invariant. The `Icon*` wrapper components are absorbed (their markup becomes the definitions' `content`). ✔
- **The icon:text baseline (`1.4`) is a core constant (`ICON_TEXT_SIZE_RATIO`), and `scale` stays a relative multiplier** (default 1 = standard size). It is *not* a `fontSize` in theme styles and *not* absorbed into absolute `scale` values. This keeps size out of `styles` (so the opt-out scenario carries no stale size tweak) while keeping `scale: 1` mean "matches the surrounding icons" — so an untuned user glyph drops in correctly. Icon `styles` are colour-only. ✔

## Implementation order

The work spans core, utils, and themes with hard dependencies (types before consumers; `defaultTheme.icons` before the renderer can drop its fallback; the exported `IconDefinition` type before `iconFromSvg`). Sequence:

1. **Types + exports (core).** Add `IconDefinition`, `ThemeIcons`; add `icons?` to `Theme`; remove `IconReplacements` and `JsonEditorProps.icons`. Update [src/index.ts](src/index.ts) (drop `IconReplacements`, add the two new types). This compiles with the old renderer still in place.
2. **`defaultTheme.icons` (core).** Author the seven `IconDefinition`s (markup lifted from the `Icon*` components) with their `scale`s. Leave the `iconAdd`…`iconCollection` style entries colour-only (no `fontSize`). Rename `defaultTheme.ts` → `.tsx` (carries JSX now).
3. **Renderer (core).** Rewrite [src/Icons.tsx](src/Icons.tsx): delete the `switch` and `Icon*` components, keep `IconSvg`, add the invariant-driven `Icon` (`icon` + PascalCase) reading from merged `icons` and sizing via the `ICON_TEXT_SIZE_RATIO` constant × `scale`. Wire `ThemeProvider` to expose merged `icons` via `useTheme()`; drop `EMPTY_ICONS` and the separate-prop path. Remove `icons` threading from [JsonEditor.tsx](src/JsonEditor.tsx).
4. **Core tests.** Replacement via `theme.icons`; `currentColor` glyph adopts theme colour; fixed-`fill` glyph resists it; `scale` changes rendered size; `collection` (ex-`chevron`) keyed correctly.
5. **`iconFromSvg` (utils).** Regex parse (string → `IconDefinition`), passthrough, interning by input string. Tests in `packages/utils/test/` (parse correctness + reference stability).
6. **Themes package build.** Confirm `react/jsx-runtime` / TSX handling in the rollup config so a theme can ship `icons`.
7. **Docs + changeset.** README (present tense: `Theme.icons`, `IconDefinition`, `currentColor` rule, `scale`; drop the `icons` prop row); migration guide (prop removed → `theme.icons`; `JSX.Element` → `IconDefinition`/`iconFromSvg`; `chevron` → `collection`); `pnpm changeset` for core + utils (+ themes if its build changes).

Steps 1–4 are one core PR; 5 is a utils PR; 6–7 fold into whichever PR touches the surface. Each step leaves the tree compiling.
