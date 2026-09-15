// Internalised from https://github.com/CarlosNZ/object-property-extractor, so
// this library has zero non-React runtime dependencies.

/* eslint-disable @typescript-eslint/no-explicit-any */
// `any` covers `fallback` and the return type: `extract` walks arbitrary
// nested data and returns whatever it finds at the path.

import { splitPropertyString } from './pathTools'

type BasicObject = {
  [key: string]: BasicObject | unknown | (BasicObject | unknown)[]
}

type BasicArray = (BasicObject | unknown)[]

type InputObject = BasicObject | BasicArray | unknown

// Returns a specific property or index (e.g. application.name) from a nested
// Object
export const extract = (
  inputObj: InputObject,
  properties: string | number | (string | number)[],
  fallback?: any
): any => {
  const propertyPathArray = Array.isArray(properties)
    ? properties
    : splitPropertyString(properties as string)

  if (propertyPathArray.length === 0) return inputObj

  const currentProperty = propertyPathArray[0]

  // For an array not targeting a specific index, extract the property from
  // *each* item and return an array of results. An empty array has nothing to
  // extract, so it falls through to the fallback or error.
  if (Array.isArray(inputObj) && typeof currentProperty !== 'number' && inputObj.length > 0)
    return inputObj.map((item) => extract(item, propertyPathArray, fallback))

  if (typeof inputObj !== 'object' || inputObj === null || !(currentProperty in inputObj))
    return fallbackOrError(inputObj, currentProperty, fallback)

  // @ts-expect-error -- `currentProperty in inputObj` narrowing isn't picked up
  const newObj = inputObj[currentProperty]
  if (propertyPathArray.length === 1) {
    return newObj
  } else {
    return extract(newObj, propertyPathArray.slice(1), fallback)
  }
}

const fallbackOrError = (obj: InputObject, property: string | number, fallback: any) => {
  if (fallback === undefined)
    throw new Error(`Unable to extract object property
Looking for property: ${property}
In object: ${JSON.stringify(obj)}`)
  else return fallback
}
