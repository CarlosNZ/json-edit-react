import {
  type SearchFilterFunction,
  type NodeData,
  type SearchFilterInputFunction,
  type KeyboardControls,
  type KeyEvent,
  type KeyboardControlsFull,
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
 * Truncates a string to a specified length, appends `...` if truncated
 */
export const truncate = (string: string, length = 200) =>
  typeof string === 'string'
    ? string.length < length
      ? string
      : `${string.slice(0, length - 2).trim()}...`
    : string

/**
 * Converts a part expressed as an array of properties to a single string
 */
export const toPathString = (path: Array<string | number>) =>
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
  booleanConfirm: ENTER,
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
