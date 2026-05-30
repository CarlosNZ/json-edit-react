import {
  type CollectionData,
  type CollectionKey,
  type JsonData,
  type KeyboardControls,
  type KeyboardControlsFull,
  type KeyEvent,
  type SortFunction,
  type TabDirection,
} from '../types'
import { extract } from './extract'
import { isCollection } from './misc'

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

  const parentData = extract(fullData, parentPath)
  const collection = transformCollection(parentData as CollectionData)

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
  const node = extract(fullData, path)
  if (!isCollection(node)) return path
  const keys = Array.isArray(node) ? node.map((_, index) => index) : Object.keys(node)

  sort<string | number>(keys, (key) => [key, node])

  const child = nextOrPrev === 'next' ? keys[0] : keys[keys.length - 1]

  return getChildRecursive(fullData, [...path, child], nextOrPrev, sort)
}

// Transform a collections (Array or Object) into a structure that is easier to
// navigate forward and back within
const transformCollection = (collection: CollectionData) => {
  if (Array.isArray(collection))
    return collection.map((value, index) => ({ index, value, key: index }))
  return Object.entries(collection).map(([key, value], index) => ({ key, value, index }))
}

type TransformedCollection =
  | {
      index: number
      value: unknown
      key: number
    }
  | {
      key: string
      value: unknown
      index: number
    }
