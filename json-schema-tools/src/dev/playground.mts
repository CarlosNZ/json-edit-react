import RefParser from '@apidevtools/json-schema-ref-parser'

import schema from '../schemas/example1.json' assert { type: 'json' }

console.log(JSON.stringify(schema, null, 2))

RefParser.dereference(schema, {}).then((result) => console.log(JSON.stringify(result, null, 2)))
