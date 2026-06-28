/**
 * A Unix-timestamp component: epoch numbers (seconds or milliseconds) shown as
 * a readable date, edited via a swappable date-picker widget. Database dumps
 * and API responses are full of them.
 */

import { type CustomNodeDefinition } from 'json-edit-react'
import {
  createDefinitionFactory,
  type DefinitionOverrides,
} from '../_common/createDefinitionFactory'
import { UnixTimestamp, type UnixTimestampCustomProps } from './component'
import { isPlausibleEpoch } from './epoch'
// Imported here too (as in DatePicker / ErrorIndicator) so `sideEffects: false`
// can't tree-shake the badge styles out for consumers who only reach the
// factory.
import './style.css'

const UnixTimestampDefinition: CustomNodeDefinition<UnixTimestampCustomProps> = {
  // The condition doubles as the guard: a number in the plausible epoch window
  // (1990–2100), as seconds or ms. It's a heuristic — consumer `condition`
  // overrides are targeting, ANDed with this, so narrow by key (`createdAt`,
  // `updatedAt`, …) to avoid matching unrelated numbers. Replacing the guard
  // needs the explicit `guard` override.
  condition: ({ value }) => isPlausibleEpoch(value),
  component: UnixTimestamp,
  showOnView: true,
  // Defaults: a view decorator. `showOnEdit` and `passOriginalNode` are set per
  // the consumer's componentProps by the factory below.
  showOnEdit: false,
  passOriginalNode: true,
  name: 'Unix Timestamp', // shown in the Type selector menu
  showInTypeSelector: true,
  editOnTypeSwitch: true,
  // Seed a new value as the current time. Seconds is the common "unix
  // timestamp" meaning; a forced ms unit re-seeds via `fromStandardType`. A
  // function so each new node gets the current time, not one fixed at module
  // load (also keeps the definition tree-shakeable).
  defaultValue: () => Math.floor(Date.now() / 1000),
  // Coerce the committed buffer to a number (the standard number editor already
  // yields one; a type-switch may hand us anything). Unparseable input seeds
  // 'now' in the configured unit.
  fromStandardType: (value, _, componentProps) => {
    const num = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(num)) return num
    const now = Date.now()
    return componentProps?.unit === 'milliseconds' ? now : Math.floor(now / 1000)
  },
  componentProps: { showTime: true },
}

const baseFactory = createDefinitionFactory(UnixTimestampDefinition)

/**
 * Build a Unix-timestamp `CustomNodeDefinition`. Pass `ReactDatePicker` (from
 * `@json-edit-react/components/widgets`) as `componentProps.DatePicker` for
 * calendar editing; without a widget, editing falls back to the standard number
 * editor. `componentProps.displayAs` (`'number'` default | `'date'`) chooses the
 * read-only view.
 */
export const unixTimestampDefinition = (
  overrides: DefinitionOverrides<UnixTimestampCustomProps> = {}
): CustomNodeDefinition<UnixTimestampCustomProps> => {
  const definition = baseFactory(overrides)
  // A DatePicker widget enables custom editing; without one, defer to core's
  // standard number editor (`showOnEdit` stays false).
  if (overrides.componentProps?.DatePicker) definition.showOnEdit = true
  // `originalNode` is only needed for the `'number'` badge view; skip computing
  // it in `'date'` mode.
  if ((overrides.componentProps?.displayAs ?? 'number') !== 'number')
    definition.passOriginalNode = false
  return definition
}
