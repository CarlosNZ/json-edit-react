import { useCallback, useMemo, useState } from 'react'
import RefParser, { JSONSchema } from '@apidevtools/json-schema-ref-parser'
import { type TypeFilterFunction } from 'json-edit-react'
import { parseSchemaElement } from './parseSchema'

interface JsonSchemaOptions {
  shouldDeref?: boolean
}

export const useJsonSchema = (originalSchema: JSONSchema, options: JsonSchemaOptions) => {
  const [schema, setSchema] = useState<JSONSchema>()

  useMemo(() => {
    RefParser.dereference(originalSchema, {}).then((result) => setSchema(result))
  }, [originalSchema])

  const restrictTypeSelection: TypeFilterFunction = useCallback(
    ({ path }) => {
      if (!schema) return true

      const type = parseSchemaElement(schema, path, 'type')

      return false
    },

    [schema]
  )

  return { restrictTypeSelection }
}
