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

// Resolve a compiled element to concrete CSS: call the closure, return the object
// as-is (a stable reference), or `{}` for an element no theme styles — so the
// public contract is always a concrete CSSProperties object.
export const getStyles = (
  compiled: CompiledStyles,
  element: ThemeableElement,
  nodeData: NodeData
) => {
  const value = compiled[element]
  return typeof value === 'function' ? value(nodeData) : (value ?? {})
}

// Bridge for the two properties that can't be set inline — they feed static
// rules in style.css, so they're written as custom properties on the root.
export const writeThemeCssVars = (compiled: CompiledStyles, docRoot: HTMLElement) => {
  const { inputHighlight, iconCopy } = compiled
  if (typeof inputHighlight !== 'function' && inputHighlight?.backgroundColor)
    docRoot.style.setProperty('--jer-highlight-color', inputHighlight.backgroundColor)
  if (typeof iconCopy !== 'function' && iconCopy?.color)
    docRoot.style.setProperty('--jer-icon-copy-color', iconCopy.color)
}
