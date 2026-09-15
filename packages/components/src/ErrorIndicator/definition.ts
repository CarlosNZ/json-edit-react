import { type CustomNodeDefinition } from 'json-edit-react'
import { createDefinitionFactory } from '../_common/createDefinitionFactory'
import { ErrorIndicatorComponent, type ErrorIndicatorProps } from './component'

const ErrorIndicatorDefinition: CustomNodeDefinition<ErrorIndicatorProps> = {
  // Guarded to value (leaf) nodes: the glyph sits beside a scalar rather than
  // wrapping a whole collection, which looks wrong and disrupts the
  // collection's own rendering. ANDed with the consumer's `condition`, so an
  // AJV `if`/`then` error reported at the parent object's path never flags
  // that collection — only the leaf whose value is wrong. `typeof null` is
  // `'object'`, so null is included as a value node explicitly. Override
  // `guard` to opt collections back in.
  condition: ({ value }) => value === null || typeof value !== 'object',
  component: ErrorIndicatorComponent,
  // Wraps the built-in rendering rather than replacing it.
  passOriginalNode: true,
  // A view decorator: the standard editor shows while editing, and the glyph
  // reappears on the next view render.
  showOnView: true,
  showOnEdit: false,
}

/**
 * Decorate nodes with a glyph (default ⚠️). Unlike the other pre-built
 * components this one has no intrinsic target, so pass a `condition` naming the
 * nodes to flag — with `useValidationState` from `@json-edit-react/utils`, say:
 *
 * ```tsx
 * const validation = useValidationState(data, validate)
 * const customNodeDefinitions = useMemo(
 *   () => [
 *     errorIndicatorDefinition({
 *       condition: (nd) => validation.hasErrorAt(nd.path),
 *     }),
 *   ],
 *   [validation]
 * )
 * ```
 *
 * The default targeting is a no-op, so calling it with no `condition` flags
 * nothing rather than every node.
 */
export const errorIndicatorDefinition = createDefinitionFactory(
  ErrorIndicatorDefinition,
  () => false
)
