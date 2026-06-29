import { type CSSProperties } from 'react'
import {
  type ThemeInput,
  type ThemeValueUnit,
  type StyleFunction,
  type ThemeableElement,
  type ThemeIcons,
  type CompiledStyles,
  type Theme,
  type NodeData,
} from '../../types'
import { defaultTheme } from './defaultTheme'
import { toArray } from '../../utils/misc'

// Elements whose bare-string shorthand targets a property other than `color`.
const DEFAULT_PROP: Partial<Record<ThemeableElement, keyof CSSProperties>> = {
  container: 'backgroundColor',
  collection: 'backgroundColor',
  collectionInner: 'backgroundColor',
  collectionElement: 'backgroundColor',
  headerRow: 'backgroundColor',
  valueRow: 'backgroundColor',
  dropZone: 'borderColor',
  inputHighlight: 'backgroundColor',
}

// The ordered theme stack a `ThemeInput` resolves to: `defaultTheme` first
// (always layer 0), then each supplied entry coerced to a full `Theme`. Shared
// by both derivations (`compileStyles`, `mergeIcons`) so the "merge over
// default" rule lives in exactly one place.
const resolveThemeStack = (themeInput: ThemeInput): Theme[] =>
  [defaultTheme, ...toArray(themeInput)].map((t) => ('styles' in t ? t : { styles: t }))

export const compileStyles = (themeInput: ThemeInput): CompiledStyles => {
  const themes = resolveThemeStack(themeInput)

  const base: Partial<Record<ThemeableElement, CSSProperties>> = {}
  const fns: Partial<Record<ThemeableElement, StyleFunction[]>> = {}

  // Resolve each theme in array order. Statics merge into `base`, functions
  // append to `fns`. Cross-theme: later overlays earlier, per element.
  for (const { fragments, styles } of themes)
    for (const key in styles) {
      const el = key as ThemeableElement
      for (const layer of ([] as ThemeValueUnit[]).concat(styles[el]!)) {
        if (typeof layer === 'function') (fns[el] ??= []).push(layer)
        else {
          const v = typeof layer === 'string' ? (fragments?.[layer] ?? layer) : layer
          base[el] = {
            ...base[el],
            ...(typeof v === 'string' ? { [DEFAULT_PROP[el] ?? 'color']: v } : v),
          }
        }
      }
    }

  // A function can target an element no theme styles statically (so it never
  // seeded `base`); give those an empty base so they're still compiled in.
  for (const key in fns) base[key as ThemeableElement] ??= {}

  const compiled = {} as CompiledStyles
  for (const key in base) {
    const el = key as ThemeableElement
    const b = base[el] as CSSProperties
    const f = fns[el]
    compiled[el] = f
      ? (nodeData: NodeData) => f.reduce((acc, fn) => ({ ...acc, ...(fn(nodeData) ?? {}) }), b)
      : b
  }
  return compiled
}

// Merge each theme's `icons` in array order (defaultTheme first), later wins
// per glyph key — exactly parallel to how `styles` compose. defaultTheme
// defines all seven glyphs, so the result is always complete and the renderer
// can index it without a fallback path.
export const mergeIcons = (themeInput: ThemeInput): Required<ThemeIcons> => {
  const merged = {} as ThemeIcons
  for (const { icons } of resolveThemeStack(themeInput)) if (icons) Object.assign(merged, icons)
  return merged as Required<ThemeIcons>
}

// Resolve a compiled element to concrete CSS: call the closure, return the
// object as-is (a stable reference), or `{}` for an element no theme styles —
// so the public contract is always a concrete CSSProperties object.
export const getStyles = (
  compiled: CompiledStyles,
  element: ThemeableElement,
  nodeData: NodeData
) => {
  const value = compiled[element]
  return typeof value === 'function' ? value(nodeData) : (value ?? {})
}

// Bridge for the two theme colours that can't be applied inline — they feed
// static rules in style.css (the `::selection` background and the copy-pulse
// glow). Returned as a CSS-custom-property style fragment to spread onto the
// editor container, where they cascade to its descendants. Scoping to the
// container (rather than the document root) keeps separate editor instances
// from clobbering each other and lets the values reach inside a shadow root;
// the `:root, :host` defaults in style.css cover the un-themed case. A per-node
// theme *function* can't collapse to one container-level value, so only static
// values are emitted.
export const getThemeCssVars = (compiled: CompiledStyles): CSSProperties => {
  const { inputHighlight, iconCopy } = compiled
  const vars: Record<string, string> = {}
  if (typeof inputHighlight !== 'function' && inputHighlight?.backgroundColor)
    vars['--jer-highlight-color'] = inputHighlight.backgroundColor
  if (typeof iconCopy !== 'function' && iconCopy?.color)
    vars['--jer-icon-copy-color'] = iconCopy.color
  return vars as CSSProperties
}
