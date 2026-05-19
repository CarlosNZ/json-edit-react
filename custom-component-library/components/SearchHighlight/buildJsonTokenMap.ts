export interface JsonToken {
  path: Array<string | number>
  role: 'key' | 'value'
  startInRaw: number
  endInRaw: number
  text: string
}

const STRUCTURAL = new Set(['{', '}', '[', ']', ':', ','])

const scanString = (json: string, start: number): number => {
  let i = start + 1
  while (i < json.length) {
    if (json[i] === '\\') i += 2
    else if (json[i] === '"') return i + 1
    else i++
  }
  return i
}

const scanLiteral = (json: string, start: number): number => {
  let i = start
  while (
    i < json.length &&
    !STRUCTURAL.has(json[i]) &&
    json[i] !== '"' &&
    json[i] !== ' ' &&
    json[i] !== '\n' &&
    json[i] !== '\r' &&
    json[i] !== '\t'
  )
    i++
  return i
}

type Context = 'object-key' | 'object-value' | 'array'

const popPathAfterValue = (contextStack: Array<Context>, pathStack: Array<string | number>): void => {
  const parentCtx = contextStack[contextStack.length - 1]
  if (parentCtx === 'object-value' || parentCtx === 'object-key') pathStack.pop()
}

export const buildJsonTokenMap = (rawJson: string): Array<JsonToken> => {
  const tokens: Array<JsonToken> = []
  const pathStack: Array<string | number> = []
  const contextStack: Array<Context> = []
  let i = 0

  while (i < rawJson.length) {
    const ch = rawJson[i]
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') { i++; continue }
    if (ch === '{') { contextStack.push('object-key'); i++; continue }
    if (ch === '[') { contextStack.push('array'); pathStack.push(0); i++; continue }
    if (ch === '}') {
      contextStack.pop()
      if (contextStack.length > 0) popPathAfterValue(contextStack, pathStack)
      i++; continue
    }
    if (ch === ']') {
      contextStack.pop(); pathStack.pop()
      if (contextStack.length > 0) popPathAfterValue(contextStack, pathStack)
      i++; continue
    }
    if (ch === ':') { if (contextStack.length > 0) contextStack[contextStack.length - 1] = 'object-value'; i++; continue }
    if (ch === ',') {
      const ctx = contextStack[contextStack.length - 1]
      if (ctx === 'object-value' || ctx === 'object-key') contextStack[contextStack.length - 1] = 'object-key'
      else if (ctx === 'array') (pathStack[pathStack.length - 1] as number) && (pathStack[pathStack.length - 1] = (pathStack[pathStack.length - 1] as number) + 1)
      i++; continue
    }

    const ctx = contextStack[contextStack.length - 1]
    const isKey = ctx === 'object-key'
    const end = ch === '"' ? scanString(rawJson, i) : scanLiteral(rawJson, i)
    const text = rawJson.slice(i, end)

    if (isKey) {
      pathStack.push(ch === '"' ? text.slice(1, -1) : text)
      tokens.push({ path: [...pathStack], role: 'key', startInRaw: i, endInRaw: end, text })
    } else {
      tokens.push({ path: [...pathStack], role: 'value', startInRaw: i, endInRaw: end, text })
      popPathAfterValue(contextStack, pathStack)
    }
    i = end
  }
  return tokens
}
