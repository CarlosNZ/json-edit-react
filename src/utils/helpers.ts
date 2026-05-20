// Shared helpers for the internal extract/assign utilities.

export type Path = (string | number)[]

// Splits a string representing a (nested) property/index on an Object or Array
// into an array of strings/indexes
// e.g. "data.organisations.nodes[0]" => ["data", "organisations", "nodes", 0]
export const splitPropertyString = (propertyPath: string): Path =>
  propertyPath
    .split(/(\.|\[\d+\])/)
    .filter((part) => part !== '.' && part !== '')
    .map((part) => {
      const match = /\[(\d+)\]/.exec(part)
      if (!match) return part
      return Number(match[1])
    })
