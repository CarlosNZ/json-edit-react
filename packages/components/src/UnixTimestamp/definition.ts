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

const UnixTimestampDefinition: CustomNodeDefinition<UnixTimestampCustomProps> = {
  // The condition doubles as the guard: a number in the plausible epoch window
  // (1990–2100), as seconds or ms. It's a heuristic, and a consumer `condition`
  // override is targeting ANDed with this, so narrow by key (`createdAt`,
  // `updatedAt`, …) to avoid matching unrelated numbers. Replacing the guard
  // needs the explicit `guard` override.
  condition: ({ value }) => isPlausibleEpoch(value),
  component: UnixTimestamp,
  showOnView: true,
  // Defaults to a view decorator; the factory below sets `showOnEdit` and
  // `passOriginalNode` from the consumer's componentProps.
  showOnEdit: false,
  passOriginalNode: true,
  name: 'Unix Timestamp', // shown in the Type selector menu
  showInTypeSelector: true,
  editOnTypeSwitch: true,
  // Seed a new value as the current time. Seconds is the common "unix
  // timestamp" meaning; a forced ms unit re-seeds via `fromStandardType`. A
  // function, so each new node gets the current time rather than one fixed at
  // module load, which also keeps the definition tree-shakeable.
  defaultValue: () => Math.floor(Date.now() / 1000),
  // Coerce the committed buffer to a number: the standard number editor already
  // yields one, but a type switch can deliver anything. Unparseable input seeds
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
 * calendar editing; without a widget, editing falls back to the standard
 * number editor. `componentProps.displayAs` (`'number'` default, or `'date'`)
 * chooses the read-only view.
 */
export const unixTimestampDefinition = (
  overrides: DefinitionOverrides<UnixTimestampCustomProps> = {}
): CustomNodeDefinition<UnixTimestampCustomProps> => {
  const definition = baseFactory(overrides)
  // A DatePicker widget enables custom editing; without one, `showOnEdit`
  // stays false and core's standard number editor takes over.
  if (overrides.componentProps?.DatePicker) definition.showOnEdit = true
  // `originalNode` is only needed for the `'number'` badge view, so `'date'`
  // mode skips computing it.
  if ((overrides.componentProps?.displayAs ?? 'number') !== 'number')
    definition.passOriginalNode = false
  return definition
}
