/**
 * A display-only number formatter: renders number values through
 * `Intl.NumberFormat` (thousands separators, currency, percent, …), edited as
 * the raw number. High polish-per-byte for dashboards and pricing data, with
 * zero dependencies (`Intl` is built into the platform).
 */

import { type CustomNodeDefinition } from 'json-edit-react'
import { createDefinitionFactory } from '../_common/createDefinitionFactory'
import { NumberFormatter, type NumberFormatterProps } from './component'

// The condition doubles as the guard: consumer `condition` overrides are
// targeting, ANDed with this by the factory; replacing it requires the
// explicit `guard` override. The guard matches *every* number, so narrow with
// a `condition` (e.g. `byKey(/price|amount|total/i)` from
// `@json-edit-react/utils`) or unrelated numbers — years, IDs, ports — get
// reformatted too.
const NumberFormatterDefinition: CustomNodeDefinition<NumberFormatterProps> = {
  condition: ({ value }) => typeof value === 'number',
  component: NumberFormatter,
  showOnView: true,
  // A display decorator, not a new type: editing falls through to core's
  // standard number editor (so the raw number is what you edit), and it stays
  // out of the Type selector menu (`showInTypeSelector` defaults false).
  showOnEdit: false,
}

export const numberFormatterDefinition = createDefinitionFactory(NumberFormatterDefinition)
