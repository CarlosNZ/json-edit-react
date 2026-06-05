/**
 * Theme type model (WIP) — see ThemeModel.md for the full design rationale.
 *
 * Three stages, low → high in the pipeline:
 *   1. Authored input  — `ThemeInput`     (what the user writes)
 *   2. Intermediate    — `ResolvedStyles` (groups fanned out, fragments resolved;
 *                                          per element a static base + function list)
 *   3. Compiled output — `CompiledStyles` (per element: a static object or one closure)
 *
 * `React.CSSProperties` is referenced via the ambient global namespace from
 * @types/react (no import needed), matching src/types.ts.
 */

import { type NodeData } from '../../types'

/* ──────────────────────────────────────────────────────────────────────────
 * Stage 1 — Authored input
 * ────────────────────────────────────────────────────────────────────────── */

/** Every individually-themeable part of the UI. */
export type ThemeableElement =
  | 'container'
  | 'collection'
  | 'collectionInner'
  | 'collectionElement'
  | 'dropZone'
  | 'property'
  | 'bracket'
  | 'itemCount'
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'input'
  | 'inputHighlight'
  | 'error'
  | 'iconCollection'
  | 'iconEdit'
  | 'iconDelete'
  | 'iconAdd'
  | 'iconCopy'
  | 'iconOk'
  | 'iconCancel'

/**
 * Built-in groups. A group key fans its value onto every member element during
 * compile, as a *lower-precedence* layer than a specific element key.
 *   value → string | number | boolean | null
 *   icon  → every `icon*` element
 * Group keys are authoring sugar and never appear in `CompiledStyles`.
 */
export type ThemeableGroup = 'value' | 'icon'

/**
 * A style function: derives CSS from a node's data at render time. May return
 * `null` / `undefined` to contribute nothing — useful as a conditional layer.
 */
export type ThemeFunction = (nodeData: NodeData) => React.CSSProperties | null | undefined

/**
 * One unit of a `ThemeElementValue`. A bare string is resolved against the
 * theme's `fragments` first; if it is not a fragment name it is a raw CSS value
 * applied to the element's default property (`color`, or `backgroundColor` /
 * `borderColor` for a few elements).
 */
export type ThemeValueUnit = string | React.CSSProperties | ThemeFunction

/**
 * The value applied to a single element or group key: one unit, or an array of
 * units merged left → right (specific overlays group per property; functions
 * always apply after statics).
 */
export type ThemeElementValue = ThemeValueUnit | ThemeValueUnit[]

/** Named, reusable style tokens, referenced by name from any `ThemeElementValue` string. */
export type ThemeFragments = Record<string, string | React.CSSProperties>

/**
 * The styles map. Keys are elements *or* groups; group keys expand onto their
 * members during compile. Inherently partial — supply only what you override.
 */
export type ThemeStyles = Partial<Record<ThemeableElement | ThemeableGroup, ThemeElementValue>>

/** A full theme definition. */
export interface Theme {
  displayName?: string
  fragments?: ThemeFragments
  styles: ThemeStyles
}

/**
 * What the `theme` prop accepts: a full `Theme`, just its `styles`, or an array
 * of either. In an array, later entries layer over earlier ones.
 */
export type ThemeInput = Theme | ThemeStyles | Array<Theme | ThemeStyles>

/* ──────────────────────────────────────────────────────────────────────────
 * Stage 2 — Intermediate (compile-time only)
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Per element, after each theme is resolved (groups fanned onto members) and the
 * resolved themes are merged in array order: a single pre-merged static base,
 * plus the ordered functions to apply on top of it. Precedence is baked into
 * build order, so this structure carries no group/fragment/scope information.
 * `fns` stays a list here only because composing it into one closure is deferred
 * to `CompiledStyles` — it is "merged" there, just into a function rather than an
 * object, since each function needs per-node data to evaluate.
 */
export interface ElementStyle {
  base: React.CSSProperties
  fns: ThemeFunction[]
}

/** Every element resolved to its `{ base, fns }`. `defaultTheme` seeds all keys. */
export type ResolvedStyles = Record<ThemeableElement, ElementStyle>

/* ──────────────────────────────────────────────────────────────────────────
 * Stage 3 — Compiled output (consumed by `getStyles` at render)
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * A compiled style function. Unlike `ThemeFunction` it never returns null: it
 * always merges the static base with each function's output, yielding a concrete
 * CSS object.
 */
export type CompiledThemeFunction = (nodeData: NodeData) => React.CSSProperties

/**
 * The compiled theme — every element mapped to its final style, and what
 * `getStyles` returns directly. Each value is either a static object (no
 * functions involved; a stable reference reused every render) or a single closure.
 */
export type CompiledStyles = Record<ThemeableElement, React.CSSProperties | CompiledThemeFunction>
