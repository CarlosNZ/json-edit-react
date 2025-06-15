import { JsonData, type CustomNodeDefinition } from '@json-edit-react'
import { testData } from '../../custom-component-library/src/data'

export const truncate = (string: string, length = 200) =>
  string.length < length ? string : `${string.slice(0, length - 2).trim()}...`

export const getLineHeight = (data: JsonData) => jsonStringify(data).split('\n').length

// Special JSON.stringify with custom replacer functions for special types
const jsonStringify = (data: JsonData) =>
  JSON.stringify(
    data,
    (_, value) => {
      if (typeof value === 'bigint') {
        return value.toString()
      }
      if (typeof value === 'symbol') {
        return value.toString()
      }
      return value
    },
    2
  )

// For the "CustomNodeLibrary" data, returns modified definitions dependent on
// the data
export const getConditionalDefinitions = (
  data: typeof testData,
  customNodeDefinitions: CustomNodeDefinition[]
) =>
  customNodeDefinitions.map((definition) => {
    if (definition?.name === 'Image')
      return {
        ...definition,
        customNodeProps: {
          imageStyles: {
            maxHeight: data?.Images?.['Image properties']?.maxHeight,
            maxWidth: data?.Images?.['Image properties']?.maxWidth,
          },
        },
      }

    if (definition?.name === 'Date Object')
      return {
        ...definition,
        customNodeProps: { showTime: data?.['Date & Time']?.['Show Time in Date?'] ?? false },
      }

    return definition
  })
