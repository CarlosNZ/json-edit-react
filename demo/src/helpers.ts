import { JsonData } from '@json-edit-react'

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
