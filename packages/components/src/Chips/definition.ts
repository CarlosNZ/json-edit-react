/**
 * A tags / chips component: arrays of short strings rendered as removable
 * chips with an inline add. Tags, labels and aliases fields are everywhere in
 * config and content data, and editing them element-by-element is clunky.
 */

import { type CustomNodeDefinition } from 'json-edit-react'
import { createDefinitionFactory } from '../_common/createDefinitionFactory'
import { Chips, type ChipsCustomProps } from './component'
import { isStringArray } from './isStringArray'

const splitChips = (text: string) =>
  text
    .split(',')
    .map((chip) => chip.trim())
    .filter(Boolean)

// The condition doubles as the guard: consumer `condition` overrides are
// targeting, ANDed with this by the factory. It matches empty arrays too, so
// removing the last chip leaves an empty chip list that can still be added to;
// narrow by key (`tags`, `labels`, …) to leave other empty arrays alone.
const ChipsDefinition: CustomNodeDefinition<ChipsCustomProps> = {
  condition: ({ value }) => isStringArray(value),
  component: Chips,
  name: 'Chips', // shown in the Type selector menu
  showInTypeSelector: true,
  // Deferred, so the switch seeds through `fromStandardType` and converts the
  // current value rather than discarding it for `defaultValue`. The component
  // commits the seeded value as soon as it renders.
  editOnTypeSwitch: true,
  showOnEdit: true,
  renderCollectionAsValue: true,
  defaultValue: [],
  // The primitive form is a comma-separated list, which `fromStandardType`
  // splits back into chips.
  toStandardType: (value) => (Array.isArray(value) ? value.join(', ') : String(value)),
  fromStandardType: (value) => {
    // A confirm's buffer already holds the chip array — pass it through.
    if (Array.isArray(value)) return value.map(String)
    if (['string', 'number', 'boolean'].includes(typeof value)) return splitChips(String(value))
    return []
  },
}

export const chipsDefinition = createDefinitionFactory(ChipsDefinition)
