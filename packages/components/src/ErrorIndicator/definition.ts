import { type CustomNodeDefinition } from 'json-edit-react'
import { createDefinitionFactory } from '../_common/createDefinitionFactory'
import { ErrorIndicatorComponent, type ErrorIndicatorProps } from './component'
// Imported here too (as in DatePicker) so `sideEffects: false` can't tree-shake
// the styles out for consumers who only reach the factory.
import './style.css'

const ErrorIndicatorDefinition: CustomNodeDefinition<ErrorIndicatorProps> = {
  // Guard to value (leaf) nodes — the glyph sits beside a scalar, not wrapped
  // around a whole collection (which also looks wrong and disrupts the
  // collection's own rendering). This is ANDed with the consumer's `condition`,
  // so e.g. an AJV `if`/`then` error reported at the parent object's path never
  // flags that collection; only the leaf where the value is wrong gets marked.
  // (`typeof null === 'object'`, so null is included as a value node
  // explicitly.) Override `guard` to opt collections back in.
  condition: ({ value }) => value === null || typeof value !== 'object',
  component: ErrorIndicatorComponent,
  // We wrap the built-in rendering rather than replace it.
  passOriginalNode: true,
  // A view decorator: the standard editor shows while editing; the glyph
  // reappears on the next view render.
  showOnView: true,
  showOnEdit: false,
}

/**
 * Decorate nodes with a glyph (default ⚠️). Unlike the other pre-built
 * components, this one has no intrinsic target — pass a `condition` for the
 * nodes to flag, e.g. with `useValidationState` from `@json-edit-react/utils`:
 *
 * ```tsx
 * const validation = useValidationState(data, validate)
 * const customNodeDefinitions = useMemo(
 *   () => [errorIndicatorDefinition({ condition: (nd) => validation.hasErrorAt(nd.path) })],
 *   [validation]
 * )
 * ```
 *
 * The default targeting is a no-op, so calling it with no `condition` flags
 * nothing (rather than every node).
 */
export const errorIndicatorDefinition = createDefinitionFactory(
  ErrorIndicatorDefinition,
  () => false
)
