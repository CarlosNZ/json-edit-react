import { JSONSchema } from '@apidevtools/json-schema-ref-parser'

export const parseSchemaElement = (
  schema: JSONSchema,
  path: Array<string | number>,
  property: 'type' | 'enum' | 'additionalProperties'
) => {
  if (path.length === 1) return schema[property]

  const currentPart = path[0]
  const remainingPath = path.slice(1)

  if (schema.type === 'object') {
    const subSchema = schema.properties?.[currentPart] as JSONSchema
    if (!subSchema) return undefined

    return parseSchemaElement(subSchema, remainingPath, property)
  }
  if (schema.type === 'array') {
    const subSchema = schema.items?.[currentPart] as JSONSchema
    if (!subSchema) return undefined

    return parseSchemaElement(subSchema, remainingPath, property)
  }
  // Something is wrong if we get to here
}
