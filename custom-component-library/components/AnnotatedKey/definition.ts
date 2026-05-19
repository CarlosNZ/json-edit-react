import { type CustomNodeDefinition } from '@json-edit-react'
import { AnnotatedKeyComponent, type AnnotationProps } from './component'

const annotations: Record<string, string> = {
  id: 'identifier',
  sku: 'stock-keeping unit',
  uuid: 'globally unique id',
  ts: 'timestamp',
  qty: 'quantity',
}

export const AnnotatedKeyDefinition: CustomNodeDefinition<AnnotationProps> = {
  condition: ({ key }) => typeof key === 'string' && key in annotations,
  customKey: AnnotatedKeyComponent,
  customNodeProps: { annotations },
}
