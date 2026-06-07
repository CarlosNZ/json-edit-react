import type { UpdateFunctionProps } from 'json-edit-react'

/**
 * The mutation events core can fire, derived from core's own contract so it
 * can't drift. Shared vocabulary across utilities (e.g. the `confirmOn` array
 * shorthand, or any helper that branches on the update event).
 *   → 'edit' | 'add' | 'delete' | 'rename' | 'move'
 */
export type JsonEditorEventName = UpdateFunctionProps['event']
