import extractProperty from 'object-property-extractor'
import {
  type SearchFilterFunction,
  type NodeData,
  type SearchFilterInputFunction,
  type KeyboardControls,
  type KeyEvent,
  type KeyboardControlsFull,
  type JsonData,
  type CollectionKey,
  type TabDirection,
  type SortFunction,
} from './types'

export const isCollection = (value: unknown): value is Record<string, unknown> | unknown[] =>
  value !== null && typeof value === 'object'

/**
 * FILTERING
 */

/**
 * Handles the overall logic for whether a node should be visible or not, and
 * returns true/false accordingly. Collections must be handled differently to
 * primitive values, as they must also check their children (recursively)
 */
export const filterNode = (
  type: 'collection' | 'value',
  nodeData: NodeData,
  searchFilter: SearchFilterFunction | undefined,
  searchText: string | undefined = ''
): boolean => {
  if (!searchFilter && !searchText) return true

  switch (type) {
    case 'collection':
      if (searchFilter) {
        if (searchFilter(nodeData, searchText)) return true
        if (!filterCollection(searchText, nodeData, searchFilter)) return false
      }
      if (!searchFilter && searchText && !filterCollection(searchText, nodeData)) return false
      break
    case 'value':
      if (searchFilter && !searchFilter(nodeData, searchText)) return false
      if (!searchFilter && searchText && !matchNode(nodeData, searchText)) return false
  }

  return true
}

// Each collection must recursively check the matches of all its descendants --
// if a deeply nested node matches the searchFilter, then all it's ancestors
// must also remain visible
const filterCollection = (
  searchText: string = '',
  nodeData: NodeData,
  matcher: SearchFilterInputFunction | SearchFilterFunction = matchNode
): boolean => {
  const collection = nodeData.value as object | unknown[]
  const entries = Object.entries(collection)

  return entries.some(([key, value]) => {
    const childPath = [...nodeData.path, key]

    const childNodeData = {
      ...nodeData,
      key,
      path: childPath,
      level: nodeData.level + 1,
      value,
      size: childPath.length,
      parentData: collection,
    }
    if (isCollection(value)) return filterCollection(searchText, childNodeData, matcher)

    return matcher(childNodeData, searchText)
  })
}

export const matchNode: (input: Partial<NodeData>, searchText: string) => boolean = (
  nodeData,
  searchText = ''
) => {
  const { value } = nodeData

  // Any partial completion of the input "null" will match null values
  if (value === null && 'null'.includes(searchText.toLowerCase())) return true

  switch (typeof value) {
    case 'string':
      return value.toLowerCase().includes(searchText.toLowerCase())
    case 'number':
      return !!String(value).includes(searchText)
    case 'boolean':
      // Will match partial completion of the inputs "true" and "false", as well
      // as "1" or "0"
      if (value) {
        return 'true'.includes(searchText.toLowerCase()) || searchText === '1'
      } else {
        return 'false'.includes(searchText.toLowerCase()) || searchText === '0'
      }
    default:
      return false
  }
}

export const matchNodeKey: SearchFilterFunction = ({ key, path }, searchText = '') => {
  if (matchNode({ value: key }, searchText)) return true
  if (path.some((field) => matchNode({ value: field }, searchText))) return true
  return false
}

/**
 * Converts a part expressed as an array of properties to a single string
 */
export const toPathString = (path: Array<string | number>, key?: 'key_') =>
  (key ?? '') +
  path
    // An empty string in a part will "disappear", so replace it with a
    // non-printable char
    .map((part) => (part === '' ? String.fromCharCode(0) : part))
    .join('.')

/**
 * KEYBOARD INTERACTION
 */

// A general keyboard handler. Matches keyboard events against the predefined
// keyboard controls (defaults, or user-defined), and maps them to specific
// actions, provided via the "eventMap"
export const handleKeyPress = (
  controls: KeyboardControlsFull,
  eventMap: Partial<Record<keyof KeyboardControls, () => void>>,
  e: React.KeyboardEvent
) => {
  const definitions = Object.entries(eventMap)

  for (const [definition, action] of definitions) {
    if (eventMatch(e, controls[definition as keyof KeyboardControlsFull], definition)) {
      e.preventDefault()
      action()
      break
    }
  }
}

// Returns the currently pressed modifier key. Only returns one, so the first
// match in the list is returned
export const getModifier = (
  e: React.KeyboardEvent | React.MouseEvent
): React.ModifierKey | undefined => {
  if (e.shiftKey) return 'Shift'
  if (e.metaKey) return 'Meta'
  if (e.ctrlKey) return 'Control'
  if (e.altKey) return 'Alt'
  return undefined
}

// Determines whether a keyboard event matches a predefined value
const eventMatch = (
  e: React.KeyboardEvent,
  keyEvent: KeyEvent | React.ModifierKey[],
  definition: string
) => {
  const eventKey = e.key
  const eventModifier = getModifier(e)
  if (Array.isArray(keyEvent)) return eventModifier ? keyEvent.includes(eventModifier) : false
  const { key, modifier } = keyEvent

  if (
    // If the stringLineBreak control is the default (Shift-Enter), don't do
    // anything, just let normal text-area behaviour occur. This allows normal
    // "Undo" behaviour for the text area to continue as normal
    definition === 'stringLineBreak' &&
    eventKey === 'Enter' &&
    eventModifier === 'Shift' &&
    key === 'Enter' &&
    modifier?.includes('Shift')
  )
    return false

  return (
    eventKey === key &&
    (modifier === eventModifier ||
      (Array.isArray(modifier) && modifier.includes(eventModifier as React.ModifierKey)))
  )
}

const ENTER = { key: 'Enter' }

const defaultKeyboardControls: KeyboardControlsFull = {
  confirm: ENTER, // default for all Value nodes, and key entry
  cancel: { key: 'Escape' },
  objectConfirm: { ...ENTER, modifier: ['Meta', 'Shift', 'Control'] },
  objectLineBreak: ENTER,
  stringConfirm: ENTER,
  stringLineBreak: { ...ENTER, modifier: ['Shift'] },
  numberConfirm: ENTER,
  numberUp: { key: 'ArrowUp' },
  numberDown: { key: 'ArrowDown' },
  tabForward: { key: 'Tab' },
  tabBack: { key: 'Tab', modifier: 'Shift' },
  booleanConfirm: ENTER,
  booleanToggle: { key: ' ' },
  clipboardModifier: ['Meta', 'Control'],
  collapseModifier: ['Alt'],
}

export const getFullKeyboardControlMap = (userControls: KeyboardControls): KeyboardControlsFull => {
  const controls = { ...defaultKeyboardControls }
  for (const key of Object.keys(defaultKeyboardControls)) {
    const typedKey = key as keyof KeyboardControls
    if (userControls[typedKey]) {
      const value = userControls[typedKey]

      const definition = (() => {
        if (['clipboardModifier', 'collapseModifier'].includes(key))
          return Array.isArray(value) ? value : [value]
        if (typeof value === 'string') return { key: value }
        return value
      })() as KeyEvent & React.ModifierKey[]

      controls[typedKey] = definition

      // Set value node defaults to generic "confirm" if not specifically
      // defined.
      const fallbackKeys: Array<keyof KeyboardControls> = [
        'stringConfirm',
        'numberConfirm',
        'booleanConfirm',
      ]
      fallbackKeys.forEach((key) => {
        if (!userControls[key] && userControls.confirm)
          controls[key] = controls.confirm as KeyEvent & React.ModifierKey[]
      })
    }
  }

  return controls
}

/**
 * TAB key helpers
 */

export const getNextOrPrevious = (
  fullData: JsonData,
  path: CollectionKey[],
  nextOrPrev: TabDirection = 'next',
  sort: SortFunction
): CollectionKey[] | null => {
  const parentPath = path.slice(0, path.length - 1)
  const thisKey = path.slice(-1)[0]
  if (thisKey === undefined) return null

  const parentData = extractProperty(fullData, parentPath)
  const collection = transformCollection(parentData as JsonData)

  if (!Array.isArray(parentData))
    sort<TransformedCollection>(collection, ({ key, value }) => [key, value])

  const thisIndex = collection.findIndex((el) => el.key === thisKey)

  const destinationIndex = thisIndex + (nextOrPrev === 'next' ? 1 : -1)

  const destination = collection[destinationIndex]

  if (!destination) {
    if (parentPath.length === 0) return null
    return getNextOrPrevious(fullData, parentPath, nextOrPrev, sort)
  }

  if (isCollection(destination.value)) {
    if (Object.keys(destination.value).length === 0) {
      return getNextOrPrevious(fullData, [...parentPath, destination.key], nextOrPrev, sort)
    }
    return getChildRecursive(fullData, [...parentPath, destination.key], nextOrPrev, sort)
  } else return [...parentPath, destination.key]
}

// If the node at "path" is a collection, tries the first/last child of that
// collection recursively until a Value node is found
const getChildRecursive = (
  fullData: JsonData,
  path: CollectionKey[],
  nextOrPrev: TabDirection = 'next',
  sort: SortFunction
) => {
  const node = extractProperty(fullData, path)
  if (!isCollection(node)) return path
  const keys = Array.isArray(node) ? node.map((_, index) => index) : Object.keys(node)

  sort<string | number>(keys, (key) => [key, node])

  const child = nextOrPrev === 'next' ? keys[0] : keys[keys.length - 1]

  return getChildRecursive(fullData, [...path, child], nextOrPrev, sort)
}

// Transform a collections (Array or Object) into a structure that is easier to
// navigate forward and back within
const transformCollection = (collection: JsonData) => {
  if (Array.isArray(collection))
    return collection.map((value, index) => ({ index, value, key: index }))
  return Object.entries(collection).map(([key, value], index) => ({ key, value, index }))
}

type TransformedCollection =
  | {
      index: number
      value: any
      key: number
    }
  | {
      key: string
      value: any
      index: number
    }

// Manipulates a TextArea (ref) directly by inserting a string at the current
// cursor/selection position. Used to insert Line break and Tab characters via
// keyboard control.
export const insertCharInTextArea = (
  textAreaRef: React.MutableRefObject<HTMLTextAreaElement>,
  insertionString: string
) => {
  const textArea = textAreaRef.current
  const startPos: number = textArea?.selectionStart ?? Infinity
  const endPos: number = textArea?.selectionEnd ?? Infinity
  const strStart = textArea?.textContent?.slice(0, startPos)
  const strEnd = textArea?.textContent?.slice(endPos)

  const newString = strStart + insertionString + strEnd
  textArea.value = newString
  textArea?.setSelectionRange(startPos + 1, startPos + 1)
  return newString
}
