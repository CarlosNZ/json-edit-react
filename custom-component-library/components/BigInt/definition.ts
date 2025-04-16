import { type CustomNodeDefinition } from '@json-edit-react'
import { BigIntComponent, BigIntProps } from './component'

export const BigIntDefinition: CustomNodeDefinition<BigIntProps> = {
  condition: ({ value }) => typeof value === 'bigint',
  element: BigIntComponent,
  // customNodeProps: {},
  showOnView: true,
  showEditTools: true,
  showOnEdit: true,
  name: 'BigInt', // shown in the Type selector menu
  showInTypesSelector: true,
  defaultValue: BigInt(9007199254740992),
}
