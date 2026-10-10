// The Chips guard: an array whose elements are all strings, empty included.
export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string')
