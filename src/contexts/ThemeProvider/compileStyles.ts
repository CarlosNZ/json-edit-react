import { type ThemeInput, type CompiledStyles, type ThemeableElement } from './types'
import { type NodeData } from '../../types'

/**
 * STUB — the real implementation lands in the next phase. Returns an empty map
 * so the test suite runs *red* against the agreed contract (tests-first), rather
 * than erroring on a missing module.
 */
export const compileStyles = (_themeInput: ThemeInput): CompiledStyles => ({}) as CompiledStyles

/** Resolve a compiled element to concrete CSS: call the closure, or return the object. */
export const getStyles = (
  compiled: CompiledStyles,
  element: ThemeableElement,
  nodeData: NodeData
) => {
  const value = compiled[element]
  return typeof value === 'function' ? value(nodeData) : value
}

/**
 * Bridge for the two properties that can't be set inline — they feed static
 * rules in style.css, so they're written as custom properties on the root.
 */
export const writeThemeCssVars = (compiled: CompiledStyles, docRoot: HTMLElement) => {
  const { inputHighlight, iconCopy } = compiled
  if (typeof inputHighlight !== 'function' && inputHighlight?.backgroundColor)
    docRoot.style.setProperty('--jer-highlight-color', inputHighlight.backgroundColor)
  if (typeof iconCopy !== 'function' && iconCopy?.color)
    docRoot.style.setProperty('--jer-icon-copy-color', iconCopy.color)
}
