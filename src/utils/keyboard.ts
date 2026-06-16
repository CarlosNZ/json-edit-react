import {
  type CollectionData,
  type CollectionKey,
  type JsonData,
  type KeyboardControls,
  type KeyboardControlsFull,
  type KeyEvent,
  type NodeData,
  type SortFunction,
  type TabDirection,
} from '../types'
import { buildNodeData } from './buildNodeData'
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
  for (const [definition, action] of Object.entries(eventMap)) {
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
  keyEvent: KeyEvent | React.ModifierKey[] | null,
  definition: string
) => {
  // A `null` control means the binding is disabled — never match it, so the
  // key falls through to native browser behaviour (e.g. Tab moves focus).
  if (!keyEvent) return false
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

// Value-node confirm controls that fall back to the generic "confirm" when not
// specifically defined by the user.
const confirmFallbackKeys: Array<keyof KeyboardControls> = [
  'stringConfirm',
  'numberConfirm',
  'booleanConfirm',
]

export const getFullKeyboardControlMap = (userControls: KeyboardControls): KeyboardControlsFull => {
  const controls = { ...defaultKeyboardControls }
  for (const key of Object.keys(defaultKeyboardControls)) {
    const typedKey = key as keyof KeyboardControls
    const value = userControls[typedKey]

    // Not supplied → keep the default binding
    if (value === undefined) continue

    const isModifierKey = key === 'clipboardModifier' || key === 'collapseModifier'

    // `null` disables the binding. The modifier-array controls
    // (`clipboardModifier`/`collapseModifier`) are consumed via `.includes()`,
    // which is always false for `[]`, so we store an empty array and they stay
    // non-null. Every other (`KeyEvent`) control is stored as `null`, which
    // `eventMatch` treats as "never matches".
    if (value === null) {
      controls[typedKey] = (isModifierKey ? [] : null) as unknown as KeyEvent & React.ModifierKey[]
      continue
    }

    const definition = (() => {
      if (isModifierKey) return Array.isArray(value) ? value : [value]
      if (typeof value === 'string') return { key: value }
      return value
    })() as KeyEvent & React.ModifierKey[]

    controls[typedKey] = definition
  }

  // Apply the generic "confirm" fallback once, after the loop has fully
  // resolved any user-supplied "confirm" control. A per-type confirm inherits
  // the generic confirm whenever `confirm` is explicitly provided — including
  // `null`, so `confirm: null` disables all of them. An explicitly set
  // per-type confirm (value or `null`) always wins, and an unset generic
  // confirm leaves the per-type defaults untouched.
  confirmFallbackKeys.forEach((key) => {
    if (userControls[key] === undefined && userControls.confirm !== undefined)
      controls[key] = controls.confirm as KeyEvent & React.ModifierKey[]
  })

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
  const startPos: number = textArea.selectionStart ?? Infinity
  const endPos: number = textArea.selectionEnd ?? Infinity
  const strStart = textArea.value.slice(0, startPos)
  const strEnd = textArea.value.slice(endPos)

  const newString = strStart + insertionString + strEnd
  textArea.value = newString
  textArea.setSelectionRange(startPos + 1, startPos + 1)
  return newString
}

/**
 * TAB key helpers
 */

export const getNextOrPrevious = (
  fullData: JsonData,
  path: CollectionKey[],
  nextOrPrev: TabDirection = 'next',
  sort: SortFunction,
  // Viability predicate. Candidate leaves whose synthesized `NodeData`
  // fails the predicate are skipped: the function recurses with the
  // failed candidate as the new starting point, continuing in the same
  // direction until a viable leaf or `null` is reached. Lets Tab
  // navigation skip filtered-out or non-editable nodes up front instead
  // of relying on a downstream redirect to bounce them. Pass `() => true`
  // for a pure structural walk (tests; never in production — the editor
  // always supplies a real predicate via `useCommon`).
  isViable: (nodeData: NodeData) => boolean
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
    return getNextOrPrevious(fullData, parentPath, nextOrPrev, sort, isViable)
  }

  let candidate: CollectionKey[] | null
  if (isCollection(destination.value)) {
    if (Object.keys(destination.value).length === 0) {
      return getNextOrPrevious(
        fullData,
        [...parentPath, destination.key],
        nextOrPrev,
        sort,
        isViable
      )
    }
    candidate = getChildRecursive(fullData, [...parentPath, destination.key], nextOrPrev, sort)
  } else {
    candidate = [...parentPath, destination.key]
  }
  if (!candidate) return null

  if (!isViable(buildNodeData(fullData, candidate, '', sort))) {
    return getNextOrPrevious(fullData, candidate, nextOrPrev, sort, isViable)
  }
  return candidate
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
  if (Array.isArray(collection)) return collection.map((value, index) => ({ value, key: index }))
  return Object.entries(collection).map(([key, value]) => ({ key, value }))
}

type TransformedCollection = { key: string | number; value: unknown }
