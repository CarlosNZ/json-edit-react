// Internalised from https://github.com/CarlosNZ/object-property-extractor
// (formerly published as the `object-property-extractor` npm package).
// Kept in-source so this library has zero non-React runtime dependencies.

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */

export type BasicObject = {
  [key: string]: BasicObject | unknown | (BasicObject | unknown)[]
}

export type BasicArray = (BasicObject | unknown)[]

export type InputObject = BasicObject | BasicArray | unknown

// Returns a specific property or index (e.g. application.name) from a nested Object
const extractProperty = (
  inputObj: InputObject,
  properties: string | number | (string | number)[],
  fallback?: any
): any => {
  const propertyPathArray = Array.isArray(properties)
    ? properties
    : splitPropertyString(properties as string)

  if (propertyPathArray.length === 0) return inputObj

  const currentProperty = propertyPathArray[0]

  // For arrays, if not targeting a specific index, try and extract the property
  // from *each* item in the array and return an array of results. If the array
  // is empty, we can't extract anything so should return fallback or error.
  if (Array.isArray(inputObj) && typeof currentProperty !== 'number' && inputObj.length > 0)
    return inputObj.map((item) => extractProperty(item, propertyPathArray, fallback))

  if (typeof inputObj !== 'object' || inputObj === null || !(currentProperty in inputObj))
    return fallbackOrError(inputObj, currentProperty, fallback)

  //  @ts-ignore -- we've already checked for values that could cause problems
  const newObj = inputObj[currentProperty]
  if (propertyPathArray.length === 1) {
    return newObj
  } else {
    return extractProperty(newObj, propertyPathArray.slice(1), fallback)
  }
}

// Splits a string representing a (nested) property/index on an Object or Array
// into array of strings/indexes
// e.g. "data.organisations.nodes[0]" => ["data","organisations", "nodes", 0]
const splitPropertyString = (propertyPath: string) => {
  const arr = propertyPath
    .split(/(\.|\[\d+\])/)
    .filter((part) => part !== '.' && part !== '')
    .map((part) => {
      const match = /\[(\d+)\]/.exec(part)
      if (!match) return part
      return Number(match[1])
    })
  return arr.flat()
}

const fallbackOrError = (obj: InputObject, property: string | number, fallback: any) => {
  if (fallback === undefined)
    throw new Error(`Unable to extract object property
Looking for property: ${property}
In object: ${JSON.stringify(obj)}`)
  else return fallback
}

export default extractProperty
