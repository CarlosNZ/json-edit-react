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
  type EditEvent,
  type EditingState,
  type BuildNodeDataFromPathRef,
} from '../types'
import { editingStatesEqual, isDescendantOf, pathsEqual, toPathString } from '../utils/pathTools'

export interface EditingStateBundle {
  currentlyEditingElement: EditingState | null
  previouslyEditedElement: CollectionKey[] | null
  tabDirection: TabDirection
  previousValue: JsonData | null
}

interface StartEditOptions {
  mode?: 'key' | 'value' | 'add'
  cancelOp?: () => void
  // Imperative (handle-driven) edit — overrides `allowEdit`. See
  // `EditingState.force`.
  force?: boolean
}

// The lifecycle event a session-mode transition fires (start / cancel).
const eventForMode = (mode: EditingState['mode'], phase: 'start' | 'cancel'): EditEvent['event'] => {
  if (mode === 'key') return phase === 'start' ? 'startRename' : 'cancelRename'
  if (mode === 'add') return phase === 'start' ? 'startAdd' : 'cancelAdd'
  return phase === 'start' ? 'startEdit' : 'cancelEdit'
}

export interface EditingStore {
  subscribe: (onChange: () => void) => () => void
  getSnapshot: () => EditingStateBundle
  getServerSnapshot: () => EditingStateBundle
  startEdit: (path: CollectionKey[], options?: StartEditOptions) => void
  /** Abort the active session — fires `onEditEvent` cancel* (true user/external cancel). */
  cancelEdit: () => void
  /** Close the active session silently — no event. Used by commit flows
   *  (the terminal event is fired by the node, from the commit outcome). */
  closeEdit: () => void
  /**
   * Synchronous phase 1 of a deferred commit. Clears `cancelOp` (so a
   * follow-up Tab-commit doesn't run a stale revert), and registers the
   * currently-editing path as "mid-commit" so `startEdit`'s displacement
   * logic doesn't fire a spurious `cancelEdit` over the pending
   * `confirmEdit`/`cancelEdit` the node will fire when `onUpdate`
   * resolves. Leaves `currentlyEditingElement` in place — the editor
   * stays open with the user's in-progress value until `endCommit`. */
  beginCommit: () => void
  /**
   * Phase 2 of a deferred commit. Deregisters `path` from the
   * mid-commit set; if `currentlyEditingElement` still points at `path`
   * (no Tab-driven advance happened in the meantime), clears the
   * session — closing the editor on the originating node only. */
  endCommit: (path: CollectionKey[]) => void
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
  onEditEventRef: React.RefObject<OnEditEventFunction | undefined>,
  buildNodeDataFromPathRef: BuildNodeDataFromPathRef
): EditingStore => {
  let state = initialState
  const listeners = new Set<() => void>()

  // cancelOp fires imperatively when a session ends without a confirm — node
  // switch, explicit cancel (Esc/✗), or external cancel (search reset,
  // `editorRef.cancelEdit`) — so the previously-editing node can reset its
  // local UI buffers. Held in a closure var (not state) so installing/clearing
  // it never notifies subscribers.
  let cancelOp: (() => void) | null = null

  // Re-entrancy guard. A registered cancelOp may itself call cancelEdit
  // (some nodes route their user-cancel handler through the store); the
  // recursive call no-ops so the outer flow owns the single state-clear and
  // single cancel* emission.
  let cancelling = false

  // Paths whose session is mid-commit: `beginCommit` cleared `cancelOp`
  // and the node is awaiting `onUpdate`. While a path is in this set,
  // `startEdit`'s displacement logic must NOT fire `cancelEdit` for it
  // (the node's own commit outcome will fire `confirmEdit`/`cancelEdit`).
  // `endCommit` deregisters and, if `currentlyEditingElement` still points
  // at that path, closes the session. Held in a closure var (not state)
  // so begin/end never notify subscribers.
  const committingPaths = new Set<string>()

  const emit = () => listeners.forEach((listener) => listener())

  // Replace the bundle and notify. Callers pass an already-changed bundle; the
  // per-action equality guards below avoid emitting on no-op transitions (so
  // re-issuing the same edit target doesn't churn subscribers).
  const commit = (next: EditingStateBundle) => {
    state = next
    emit()
  }

  // Fire an `onEditEvent` for a session at `path`, building its `NodeData` from
  // the live document. No-op if there's no consumer or the accessor isn't ready.
  const fireEditEvent = (path: CollectionKey[], event: EditEvent['event']) => {
    if (!onEditEventRef.current) return
    const nodeData = buildNodeDataFromPathRef.current?.(path)
    if (nodeData) onEditEventRef.current({ ...nodeData, event } as EditEvent)
  }

  const startEdit = (path: CollectionKey[], options?: StartEditOptions) => {
    const mode = options?.mode ?? 'value'
    const next: EditingState = { path, mode, force: options?.force }
    const prev = state.currentlyEditingElement
    const isSwitch = prev !== null && !editingStatesEqual(prev, next)

    // Run the outgoing session's UI cleanup before installing the new one.
    // If that cancelOp itself routed through `cancelEdit` (some nodes do),
    // it will have cleared state and fired the cancel* already — the
    // post-check below avoids a double-fire.
    const op = cancelOp
    cancelOp = null
    if (op) op()

    cancelOp = options?.cancelOp ?? null

    // Fire cancel* for the displaced session if the cancelOp didn't already
    // tear it down. `state.currentlyEditingElement` still pointing at `prev`
    // means no recursive cancelEdit fired the event. A `prev` that is
    // mid-commit (its node is awaiting `onUpdate`) is exempt — it will
    // fire its own `confirmEdit`/`cancelEdit` from the commit outcome, so
    // emitting `cancelEdit` here would be a contradictory double-fire.
    if (
      isSwitch &&
      state.currentlyEditingElement !== null &&
      editingStatesEqual(state.currentlyEditingElement, prev) &&
      !committingPaths.has(toPathString(prev.path))
    ) {
      fireEditEvent(prev.path, prev.mode === 'key' ? 'cancelRename' : 'cancelEdit')
    }

    if (!editingStatesEqual(state.currentlyEditingElement, next)) {
      commit({ ...state, currentlyEditingElement: next })
    }

    fireEditEvent(path, eventForMode(mode, 'start'))
  }

  // True cancel (user Esc/✗, node switch, `editorRef.cancel`, search reset): run
  // the session's UI cleanup (`cancelOp`), close the session, AND fire cancel*.
  // Snapshot `prev` before nulling so the event uses the prior path/mode. The
  // `cancelling` guard makes a reentrant cancelEdit (a `cancelOp` that itself
  // routes back through cancelEdit) a no-op rather than a double-fire.
  const cancelEdit = () => {
    if (cancelling) return
    const prev = state.currentlyEditingElement
    cancelling = true
    try {
      const op = cancelOp
      cancelOp = null
      if (op) op()
      if (prev !== null) {
        if (state.currentlyEditingElement !== null) {
          commit({ ...state, currentlyEditingElement: null })
        }
        fireEditEvent(prev.path, eventForMode(prev.mode, 'cancel'))
      }
    } finally {
      cancelling = false
    }
  }

  // Silent close for commit flows — clears state + cancelOp, fires NO event (the
  // node fires the terminal confirm*/cancel* from the commit outcome). Clearing
  // cancelOp is load-bearing: a Tab-commit closes then `startEdit(next)`, which
  // would otherwise run the stale cancelOp and revert the just-committed value.
  const closeEdit = () => {
    cancelOp = null
    if (state.currentlyEditingElement !== null) {
      commit({ ...state, currentlyEditingElement: null })
    }
  }

  // Two-phase deferred commit (issue #325). The synchronous phase clears
  // `cancelOp` (same load-bearing reason as `closeEdit` — keeps Tab-commit
  // safe by ensuring `startEdit(next)` can't run a stale revert) and marks
  // the active session as mid-commit, but leaves `currentlyEditingElement`
  // in place so `isEditing` stays true and the editor (with the user's
  // in-progress value) remains visible until `onUpdate` resolves.
  const beginCommit = () => {
    cancelOp = null
    const cur = state.currentlyEditingElement
    if (cur !== null) committingPaths.add(toPathString(cur.path))
  }

  // Resolve phase: deregister and, only if `currentlyEditingElement` still
  // points at the originating path, close the session. A Tab-driven
  // `startEdit(next)` may have advanced the editing target during the
  // pending window — in that case the new session owns the visible state,
  // and we just remove the stale committing-path entry.
  const endCommit = (path: CollectionKey[]) => {
    committingPaths.delete(toPathString(path))
    const cur = state.currentlyEditingElement
    if (cur !== null && pathsEqual(cur.path, path)) {
      commit({ ...state, currentlyEditingElement: null })
    }
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
    closeEdit,
    beginCommit,
    endCommit,
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
  buildNodeDataFromPathRef: BuildNodeDataFromPathRef
}

export const EditingProvider = ({
  children,
  onEditEvent,
  buildNodeDataFromPathRef,
}: EditingProps) => {
  // Keep the latest `onEditEvent` in a ref so an inline consumer callback
  // doesn't force the store to be recreated. Written during render but only
  // ever *read* inside actions (event time), so this is safe.
  const onEditEventRef = useRef(onEditEvent)
  onEditEventRef.current = onEditEvent

  // The store is created once and its identity never changes, so the context
  // value is stable — `useContext` alone never triggers a re-render. Both refs
  // are read only at event time, after `Editor` has populated the accessor.
  const storeRef = useRef<EditingStore | null>(null)
  if (storeRef.current === null)
    storeRef.current = createEditingStore(onEditEventRef, buildNodeDataFromPathRef)

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
      closeEdit: store.closeEdit,
      beginCommit: store.beginCommit,
      endCommit: store.endCommit,
      setTabDirection: store.setTabDirection,
      recordPreviousEdit: store.recordPreviousEdit,
      setPreviousValue: store.setPreviousValue,
      areChildrenBeingEdited: store.areChildrenBeingEdited,
    }),
    [bundle, store]
  )
}
