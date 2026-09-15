/**
 * A view-mode decorator that wraps the built-in node and appends (or prepends)
 * a small glyph — typically an error marker (⚠️). It renders `originalNode`
 * unchanged and adds the glyph beside it, so it works on a value (leaf) node of
 * any type and inherits the node's normal styling and edit affordances. The
 * definition guards to value nodes (not collections — see `definition.ts`).
 *
 * The component is presentation-only: *which* nodes it decorates is the
 * definition's `condition` (see `errorIndicatorDefinition`), not anything this
 * component reads. Point that condition at your error nodes — e.g.
 * `condition: (nd) => validation.hasErrorAt(nd.path)` with `useValidationState`
 * from `@json-edit-react/utils`.
 */

import { type ReactNode } from 'react'
import { type CustomComponentProps } from 'json-edit-react'
import css from './style.css?inline'
import { useStyles } from '../_common/useStyles'

export interface ErrorIndicatorProps {
  /** The glyph shown beside a flagged node. Default `'⚠️'`. */
  errorGlyph?: ReactNode
  /** Glyph placement relative to the node. Default `'after'`. */
  position?: 'before' | 'after'
}

export const ErrorIndicatorComponent = ({
  originalNode,
  componentProps,
}: CustomComponentProps<ErrorIndicatorProps>) => {
  useStyles('jer-error-indicator', css)
  const { errorGlyph = '⚠️', position = 'after' } = componentProps ?? {}

  const glyph = (
    <span className="jer-error-indicator" role="img" aria-label="error">
      {errorGlyph}
    </span>
  )

  // Layout lives entirely in ./style.css, keyed on the wrapper class, so a
  // consumer can restyle it with an ordinary rule. An inline `style` here
  // would win over any author stylesheet short of `!important`.
  return (
    <span className="jer-error-indicator-wrapper">
      {position === 'before' && glyph}
      {originalNode}
      {position === 'after' && glyph}
    </span>
  )
}
