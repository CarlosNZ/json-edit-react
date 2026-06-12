import { type CustomNodeDefinition, type FilterFunction } from 'json-edit-react'

/**
 * Builds the customization factory for a pre-built custom-node definition.
 *
 * A pre-built definition's `condition` doubles as its guard — the check that
 * keeps its component safe to render (Markdown's `typeof value === 'string'`,
 * DatePicker's ISO regex). Consumers customizing a definition almost always
 * want to narrow *where* it applies, not loosen *what* it can render, so the
 * factory re-interprets a consumer-supplied `condition` as targeting and ANDs
 * it with the guard: narrowing can never expose the component to data it
 * can't handle. Replacing the guard itself requires the explicit `guard`
 * override — a deliberate, named act rather than the default spelling.
 *
 * The base definition objects are deliberately not exported from the package:
 * spreading one and overriding `condition` silently drops the guard, and the
 * factory only closes that door if it's the only one.
 */

export type DefinitionOverrides<T extends object = Record<string, unknown>> = Partial<
  Omit<CustomNodeDefinition<T>, 'condition'>
> & {
  // Replaces the definition's default targeting (usually "everywhere the
  // guard passes"); always ANDed with the guard
  condition?: FilterFunction
  // Replaces the guard — the component's safety contract becomes the
  // consumer's responsibility
  guard?: FilterFunction
}

export const createDefinitionFactory =
  <T extends object = Record<string, unknown>>(
    base: CustomNodeDefinition<T>,
    defaultTargeting: FilterFunction = () => true
  ) =>
  (overrides: DefinitionOverrides<T> = {}): CustomNodeDefinition<T> => {
    const {
      guard = base.condition,
      condition: targeting = defaultTargeting,
      componentProps,
      ...rest
    } = overrides
    const definition: CustomNodeDefinition<T> = {
      ...base,
      ...rest,
      condition: (nodeData) => guard(nodeData) && targeting(nodeData),
    }
    // Shallow-merged rather than override-wins, so a consumer can add one
    // prop without re-stating the base's defaults (e.g. DatePicker's
    // `{ showTime: true }`). Conditional so definitions without
    // componentProps don't gain an empty object.
    if (base.componentProps || componentProps)
      definition.componentProps = { ...base.componentProps, ...componentProps } as T
    return definition
  }
