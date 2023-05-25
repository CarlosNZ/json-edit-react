import fetch from 'node-fetch'
import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const BASE_URL = 'https://swapi.dev/api/people/1/'
const DEPTH = 3

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const memo = {}

const getData = async (url) => {
  console.log('Fetching...', url)
  const response = await fetch(url)
  return await response.json()
}

const getCategory = (url) => {
  const matches = /^https:\/\/swapi.dev\/api\/(.+)\/[0-9]/.exec(url)
  return matches[1]
}

const propertyMutations = {
  gender: (data) => ['isMale', data === 'male'],
  url: (data) => ['url', data],
}

const keyProperties = {
  people: 'name',
  films: 'title',
  starships: 'name',
  vehicles: 'name',
  planets: 'name',
  species: 'name',
}

const retrieveSingle = async (url) => {
  if (url in memo) {
    const result = memo[url]
    const category = getCategory(url)
    const returnValue = result[keyProperties[category]]
    console.log('Already retrieved:', url, 'Returning', returnValue)
    return returnValue
  } else {
    const result = await getData(url)
    const category = getCategory(url)
    return result[keyProperties[category]]
  }
}

const runScript = async (url, depth, currentDepth = 1) => {
  if (url in memo) {
    const savedResult = memo[url]
    const category = getCategory(url)
    const result = savedResult[keyProperties[category]]
    console.log('Already retrieved:', url, 'Returning', result)
    return result
  }
  const result = await getData(url)
  memo[url] = result

  const output = []

  for (const [key, value] of Object.entries(result)) {
    if (key in propertyMutations) {
      output.push(propertyMutations[key](value))
      continue
    }

    if (/^[0-9]+$/.test(value)) {
      output.push([key, Number(value)])
      continue
    }

    if (depth === currentDepth) {
      if (typeof value === 'string' && /^https:\/\/swapi\.dev/.test(value)) {
        // console.log('ValueMatch', value)
        output.push([key, await retrieveSingle(value)])
        continue
      }
      if (Array.isArray(value)) {
        const result =
          value.length === 0 ? null : await Promise.all(value.map((v) => retrieveSingle(v)))
        output.push([key, result])
        continue
      }
      output.push([key, value])
      continue
    }

    if (Array.isArray(value)) {
      output.push([
        key,
        value.length === 0
          ? null
          : await Promise.all(value.map((val) => runScript(val, depth, currentDepth + 1))),
      ])
      continue
    }

    if (/^https:\/\/swapi\.dev/.test(value)) {
      output.push([key, await runScript(value, depth, currentDepth + 1)])
      continue
    }

    // Remaining
    output.push([key, value])
  }

  return Object.fromEntries(await Promise.all(output))
}

runScript(BASE_URL, DEPTH).then((output) => {
  console.log(JSON.stringify(output, null, 2))
  fs.writeFile(path.join(__dirname, './output.json'), JSON.stringify(output, null, 2), () =>
    console.log('DONE!')
  )
})
