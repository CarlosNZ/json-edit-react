import { JsonData } from './imports'

export const truncate = (string: string, length = 200) =>
  string.length < length ? string : `${string.slice(0, length - 2).trim()}...`

export const getLineHeight = (data: JsonData) => JSON.stringify(data, null, 2).split('\n').length
