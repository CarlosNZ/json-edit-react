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
 * Exposes named action functions instead of an omnibus setter. Actions are
 * wrapped in `useCallback` so they keep stable identities across renders
 * (lets consumers list them honestly in `useEffect` dep arrays). State is
 * held in a single `useState` object so multi-field transitions commit
 * atomically via the updater form.
 */

import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import {
  type TabDirection,
  type CollectionKey,
  type JsonData,
  type OnEditEventFunction,
  type EditingState,
} from '../types'
import { editingStatesEqual, isDescendantOf } from '../utils/pathTools'

interface EditingStateBundle {
  currentlyEditingElement: EditingState | null
  previouslyEditedElement: CollectionKey[] | null
  tabDirection: TabDirection
  previousValue: JsonData | null
}

interface EditingContext extends EditingStateBundle {
  areChildrenBeingEdited: (path: CollectionKey[]) => boolean
  startEdit: (
    path: CollectionKey[],
    options?: { mode?: 'key' | 'value'; cancelOp?: () => void }
  ) => void
  cancelEdit: () => void
  setTabDirection: (dir: TabDirection) => void
  recordPreviousEdit: (path: CollectionKey[]) => void
  setPreviousValue: (value: JsonData | null) => void
}

const EditingProviderContext = createContext<EditingContext | null>(null)

interface EditingProps {
  children: React.ReactNode
  onEditEvent?: OnEditEventFunction
}

const initialState: EditingStateBundle = {
  currentlyEditingElement: null,
  previouslyEditedElement: null,
  tabDirection: 'next',
  previousValue: null,
}

export const EditingProvider = ({ children, onEditEvent }: EditingProps) => {
  const [state, setState] = useState<EditingStateBundle>(initialState)

  // cancelOp is a function-valued field that fires imperatively before
  // transitioning to a new edit. Kept in a ref so installing/clearing it
  // doesn't trigger re-renders, and so closure semantics over the latest
  // registered cancel are predictable.
  const cancelOpRef = useRef<(() => void) | null>(null)

  const startEdit = useCallback(
    (
      path: CollectionKey[],
      options?: { mode?: 'key' | 'value'; cancelOp?: () => void }
    ) => {
      const mode = options?.mode ?? 'value'
      const next: EditingState = { path, mode }

      // Fire the cancel registered for the *previous* edit (if any) before
      // we transition — lets that node's UI reset cleanly.
      if (cancelOpRef.current) cancelOpRef.current()
      cancelOpRef.current = options?.cancelOp ?? null

      // Bail on equivalent transitions so re-issuing the same edit target
      // doesn't trigger a redundant re-render. `===` won't help here because
      // `next` is a fresh object literal each call.
      setState((prev) =>
        editingStatesEqual(prev.currentlyEditingElement, next)
          ? prev
          : { ...prev, currentlyEditingElement: next }
      )

      onEditEvent?.(path, mode === 'key')
    },
    [onEditEvent]
  )

  const cancelEdit = useCallback(() => {
    cancelOpRef.current = null
    setState((prev) =>
      prev.currentlyEditingElement === null
        ? prev
        : { ...prev, currentlyEditingElement: null }
    )
    onEditEvent?.(null, false)
  }, [onEditEvent])

  const setTabDirection = useCallback((dir: TabDirection) => {
    setState((prev) => (prev.tabDirection === dir ? prev : { ...prev, tabDirection: dir }))
  }, [])

  const recordPreviousEdit = useCallback((path: CollectionKey[]) => {
    setState((prev) => ({ ...prev, previouslyEditedElement: path }))
  }, [])

  const setPreviousValue = useCallback((value: JsonData | null) => {
    setState((prev) => (prev.previousValue === value ? prev : { ...prev, previousValue: value }))
  }, [])

  const areChildrenBeingEdited = useCallback(
    (path: CollectionKey[]) =>
      state.currentlyEditingElement !== null &&
      isDescendantOf(state.currentlyEditingElement.path, path),
    [state.currentlyEditingElement]
  )

  return (
    <EditingProviderContext.Provider
      value={{
        currentlyEditingElement: state.currentlyEditingElement,
        previouslyEditedElement: state.previouslyEditedElement,
        tabDirection: state.tabDirection,
        previousValue: state.previousValue,
        areChildrenBeingEdited,
        startEdit,
        cancelEdit,
        setTabDirection,
        recordPreviousEdit,
        setPreviousValue,
      }}
    >
      {children}
    </EditingProviderContext.Provider>
  )
}

export const useEditing = () => {
  const context = useContext(EditingProviderContext)
  if (!context) throw new Error('Missing Editing Context Provider')
  return context
}
