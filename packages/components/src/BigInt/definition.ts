import { isCollection, type CustomNodeDefinition } from 'json-edit-react'
import { BigIntComponent, BigIntProps } from './component'

export const BigIntDefinition: CustomNodeDefinition<BigIntProps> = {
  condition: ({ value }) => typeof value === 'bigint',
  component: BigIntComponent,
  // componentProps: {},
  showOnView: true,
  showEditTools: true,
  showOnEdit: true,
  name: 'BigInt', // shown in the Type selector menu
  showInTypeSelector: true,
  defaultValue: BigInt(9007199254740992),
  // A digit string coerces correctly to both string and number targets
  toStandardValue: (value) => String(value),
  stringifyReplacer: (value) =>
    typeof value === 'bigint' ? { __type: 'bigint', value: String(value) } : value,
  parseReviver: (value) =>
    isCollection(value) && '__type' in value && 'value' in value && value.__type === 'bigint'
      ? BigInt(value.value as string)
      : value,
}
