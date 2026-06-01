/**
 * Editing state for the tree:
 * - the currently editing node (ensures only one node at a time can be edited)
 * - the "cancel" callback for the editing node (lets the UI reset a node when
 *   the user clicks another "Edit" button elsewhere)
 * - tab-navigation bookkeeping (direction + previously edited path)
 * - the "previous value" snapshot used when the user changes a node's data
 *   type and then cancels (the type change is a real data update, so cancel
 *   needs an explicit revert path)
 *
 * ## Why an external store (not useState + context value)
 *
 * Every node reads editing state, so with a plain context value any edit
 * transition re-rendered *every* consumer (`React.memo` can't stop a context
 * update). On a large tree that's the dominant cost of starting/moving an edit.
 *
 * Instead the state lives in a tiny external store (a mutable bundle + a
 * listener `Set`), exposed through React's built-in `useSyncExternalStore`
 * (React >=18). The *context value is the store object itself* — a stable
 * reference that never changes — so `useContext` alone never re-renders anyone.
 * Components subscribe to a derived *slice* via `useEditingSelector`; a node
 * that selects a boolean (`isEditing` for its own path) re-renders only when
 * that boolean flips. Moving an edit from node A to node B re-renders exactly A
 * and B. Actions are read via the non-subscribing `useEditingStore`.
 *
 * `useEditing` remains as a whole-bundle compatibility hook (used by the
 * slice-isolation test); it subscribes to every change, so it must NOT be used
 * on the per-node hot path — use selectors there.
 */

import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react'
import {
  type TabDirection,
  type CollectionKey,
  type JsonData,
  type OnEditEventFunction,
  type EditingState,
} from '../types'
import { editingStatesEqual, isDescendantOf, pathsEqual } from '../utils/pathTools'

export interface EditingStateBundle {
  currentlyEditingElement: EditingState | null
  previouslyEditedElement: CollectionKey[] | null
  tabDirection: TabDirection
  previousValue: JsonData | null
}

interface StartEditOptions {
  mode?: 'key' | 'value'
  cancelOp?: () => void
}

export interface EditingStore {
  subscribe: (onChange: () => void) => () => void
  getSnapshot: () => EditingStateBundle
  getServerSnapshot: () => EditingStateBundle
  startEdit: (path: CollectionKey[], options?: StartEditOptions) => void
  cancelEdit: () => void
  setTabDirection: (dir: TabDirection) => void
  recordPreviousEdit: (path: CollectionKey[]) => void
  setPreviousValue: (value: JsonData | null) => void
  /** Imperative read for event handlers — does not subscribe. */
  areChildrenBeingEdited: (path: CollectionKey[]) => boolean
}

const initialState: EditingStateBundle = {
  currentlyEditingElement: null,
  previouslyEditedElement: null,
  tabDirection: 'next',
  previousValue: null,
}

const createEditingStore = (
  onEditEventRef: React.RefObject<OnEditEventFunction | undefined>
): EditingStore => {
  let state = initialState
  const listeners = new Set<() => void>()

  // cancelOp fires imperatively before transitioning to a new edit, letting the
  // previously-editing node's UI reset. Held in a closure var (not state) so
  // installing/clearing it never notifies subscribers.
  let cancelOp: (() => void) | null = null

  const emit = () => listeners.forEach((listener) => listener())

  // Replace the bundle and notify. Callers pass an already-changed bundle; the
  // per-action equality guards below avoid emitting on no-op transitions (so
  // re-issuing the same edit target doesn't churn subscribers).
  const commit = (next: EditingStateBundle) => {
    state = next
    emit()
  }

  const startEdit = (path: CollectionKey[], options?: StartEditOptions) => {
    const mode = options?.mode ?? 'value'
    const next: EditingState = { path, mode }

    if (cancelOp) cancelOp()
    cancelOp = options?.cancelOp ?? null

    if (!editingStatesEqual(state.currentlyEditingElement, next)) {
      commit({ ...state, currentlyEditingElement: next })
    }

    onEditEventRef.current?.(path, mode === 'key')
  }

  const cancelEdit = () => {
    cancelOp = null
    if (state.currentlyEditingElement !== null) {
      commit({ ...state, currentlyEditingElement: null })
    }
    onEditEventRef.current?.(null, false)
  }

  const setTabDirection = (dir: TabDirection) => {
    if (state.tabDirection !== dir) commit({ ...state, tabDirection: dir })
  }

  const recordPreviousEdit = (path: CollectionKey[]) => {
    // Callers pass a freshly-allocated `path`, so guard on value equality —
    // otherwise every Tab re-commits an equal path and wakes all `useEditing`
    // subscribers for nothing.
    const prev = state.previouslyEditedElement
    if (prev === null || !pathsEqual(prev, path)) {
      commit({ ...state, previouslyEditedElement: path })
    }
  }

  const setPreviousValue = (value: JsonData | null) => {
    if (state.previousValue !== value) commit({ ...state, previousValue: value })
  }

  return {
    subscribe: (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    getSnapshot: () => state,
    getServerSnapshot: () => state,
    startEdit,
    cancelEdit,
    setTabDirection,
    recordPreviousEdit,
    setPreviousValue,
    areChildrenBeingEdited: (path) =>
      state.currentlyEditingElement !== null &&
      isDescendantOf(state.currentlyEditingElement.path, path),
  }
}

const EditingProviderContext = createContext<EditingStore | null>(null)

interface EditingProps {
  children: React.ReactNode
  onEditEvent?: OnEditEventFunction
}

export const EditingProvider = ({ children, onEditEvent }: EditingProps) => {
  // Keep the latest `onEditEvent` in a ref so an inline consumer callback
  // doesn't force the store to be recreated. Written during render but only
  // ever *read* inside actions (event time), so this is safe.
  const onEditEventRef = useRef(onEditEvent)
  onEditEventRef.current = onEditEvent

  // The store is created once and its identity never changes, so the context
  // value is stable — `useContext` alone never triggers a re-render.
  const storeRef = useRef<EditingStore | null>(null)
  if (storeRef.current === null) storeRef.current = createEditingStore(onEditEventRef)

  return (
    <EditingProviderContext.Provider value={storeRef.current}>
      {children}
    </EditingProviderContext.Provider>
  )
}

/** Returns the (stable) store. Use for actions and imperative reads — no subscription. */
export const useEditingStore = (): EditingStore => {
  const store = useContext(EditingProviderContext)
  if (!store) throw new Error('Missing Editing Context Provider')
  return store
}

// The slice a selector may return: a primitive only. Primitives are
// `Object.is`-stable, so the `getSnapshot` result is referentially stable when
// nothing changed; a selector returning a fresh object/array would compare
// unequal on every store emit and re-render its subscriber each time.
type EditingSelection = string | number | boolean | bigint | symbol | null | undefined

/**
 * Subscribe to a derived slice of editing state. The selector must return a
 * PRIMITIVE — primitives are `Object.is`-stable, so the component re-renders
 * only when the selected value actually changes, sidestepping the
 * `getSnapshot` caching pitfall without the external `with-selector` shim. The
 * `T extends EditingSelection` bound enforces that contract at compile time:
 * a selector returning a fresh object/array won't type-check.
 */
export const useEditingSelector = <T extends EditingSelection>(
  selector: (state: EditingStateBundle) => T
): T => {
  const store = useEditingStore()
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getSnapshot()),
    () => selector(store.getServerSnapshot())
  )
}

/**
 * Whole-bundle compatibility hook: subscribes to every editing change and
 * returns the full state plus the (stable) actions. The returned object is
 * memoized so an unrelated parent re-render hands back the same reference
 * (what a downstream `React.memo` relies on). Do NOT use on the per-node hot
 * path — it wakes on every edit transition; use `useEditingSelector` there.
 */
export const useEditing = () => {
  const store = useEditingStore()
  const bundle = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
  return useMemo(
    () => ({
      ...bundle,
      startEdit: store.startEdit,
      cancelEdit: store.cancelEdit,
      setTabDirection: store.setTabDirection,
      recordPreviousEdit: store.recordPreviousEdit,
      setPreviousValue: store.setPreviousValue,
      areChildrenBeingEdited: store.areChildrenBeingEdited,
    }),
    [bundle, store]
  )
}
