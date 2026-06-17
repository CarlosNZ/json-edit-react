import { type CSSProperties } from 'react'
import {
  type ThemeInput,
  type ThemeValueUnit,
  type ThemeFunction,
  type ThemeableElement,
  type CompiledStyles,
  type Theme,
  type NodeData,
} from '../../types'
import { defaultTheme } from './defaultTheme'

// Elements whose bare-string shorthand targets a property other than `color`.
const DEFAULT_PROP: Partial<Record<ThemeableElement, keyof CSSProperties>> = {
  container: 'backgroundColor',
  collection: 'backgroundColor',
  collectionInner: 'backgroundColor',
  collectionElement: 'backgroundColor',
  dropZone: 'borderColor',
  inputHighlight: 'backgroundColor',
}

export const compileStyles = (themeInput: ThemeInput): CompiledStyles => {
  const themes: Theme[] = [
    defaultTheme,
    ...(Array.isArray(themeInput) ? themeInput : [themeInput]),
  ].map((t) => ('styles' in t ? t : { styles: t }))

  const base: Partial<Record<ThemeableElement, CSSProperties>> = {}
  const fns: Partial<Record<ThemeableElement, ThemeFunction[]>> = {}

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
