import type { CSSProperties } from 'react'
import type { NodeData, ThemeStyles } from 'json-edit-react'
import type { ValidationState } from './types'

export interface ValidationStyleOptions {
  /** Styles for a leaf value node that has an error. Defaults to red text. */
  error?: CSSProperties
  /**
   * Styles for a collection element containing an error somewhere inside it.
   * Omitted by default — ancestor marking is opt-in.
   */
  within?: CSSProperties
}

const DEFAULT_ERROR: CSSProperties = { color: '#cb4b16' }

/**
 * Build a partial theme that flags invalid nodes, to compose over your own:
 * `theme={[myTheme, validationStyles(validation)]}`.
 *
 * The leaf value slots (`string` / `number` / `boolean` / `null`) consult
 * `hasErrorAt` per node; with the `within` option the `collectionElement` slot
 * consults `hasErrorWithin` so a collapsed parent can show that something inside
 * it is invalid (same mount-frontier blindness as search — only mounted nodes
 * paint). Styles are inline, so this is colour/border/etc. only; for a glyph or
 * icon use a custom-node component that wraps `originalNode`.
 *
 * Memoize it on the validation state so the tree re-renders only when validity
 * changes: `useMemo(() => [base, validationStyles(v)], [v])`.
 */
export const validationStyles = (
  validation: ValidationState,
  options: ValidationStyleOptions = {}
): ThemeStyles => {
  const error = options.error ?? DEFAULT_ERROR
  const { within } = options

  const leaf = (nodeData: NodeData) => (validation.hasErrorAt(nodeData.path) ? error : null)

  const styles: ThemeStyles = {
    string: leaf,
    number: leaf,
    boolean: leaf,
    null: leaf,
  }

  if (within)
    styles.collectionElement = (nodeData: NodeData) =>
      validation.hasErrorWithin(nodeData.path) ? within : null

  return styles
}
