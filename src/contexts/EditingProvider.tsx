/**
 * Editing state for the tree:
 * - the currently editing node (ensures only one node at a time can be edited)
 * - the "cancel" callback for the editing node (lets the UI reset a node when
 *   the user clicks another "Edit" button elsewhere)
 * - tab-navigation bookkeeping (direction + previously edited path)
 * - the "previous value" snapshot used when the user changes a node's data
 *   type and then cancels (the type change is a real data update, so cancel
 *   needs an explicit revert path)
 */

import React, { createContext, useContext, useRef, useState } from 'react'
import {
  type TabDirection,
  type CollectionKey,
  type JsonData,
  type OnEditEventFunction,
  type EditingState,
} from '../types'
import { editingStatesEqual, isDescendantOf } from '../utils/pathTools'

interface EditingContext {
  currentlyEditingElement: EditingState | null
  setCurrentlyEditingElement: (
    path: CollectionKey[] | null,
    cancelOpOrKey?: (() => void) | 'key'
  ) => void
  previouslyEditedElement: CollectionKey[] | null
  setPreviouslyEditedElement: (path: CollectionKey[]) => void
  areChildrenBeingEdited: (path: CollectionKey[]) => boolean
  tabDirection: TabDirection
  setTabDirection: (dir: TabDirection) => void
  previousValue: JsonData | null
  setPreviousValue: (value: JsonData | null) => void
}

const EditingProviderContext = createContext<EditingContext | null>(null)

interface EditingProps {
  children: React.ReactNode
  onEditEvent?: OnEditEventFunction
}

export const EditingProvider = ({ children, onEditEvent }: EditingProps) => {
  const [currentlyEditingElement, setCurrentlyEditingElement] = useState<EditingState | null>(null)

  // Holds the "previous" value when the user changes a node's data type.
  // Changing data type causes a proper data update, so cancelling afterwards
  // can't naturally revert to the previous type — this snapshot allows it.
  const [previousValue, setPreviousValue] = useState<JsonData | null>(null)
  const cancelOp = useRef<(() => void) | null>(null)

  // tabDirection and previouslyEdited support Tab navigation. Each node can
  // find the "previous" or "next" node on Tab detection, but has no way to know
  // whether that node is actually visible or editable. So each node runs this
  // check on itself on render, and if it has been set to "isEditing" when it
  // shouldn't be, it immediately goes to the next (and the next, etc...). These
  // two values hold some state which is useful in this slightly messy process.
  const tabDirection = useRef<TabDirection>('next')
  const previouslyEdited = useRef<CollectionKey[] | null>(null)

  const updateCurrentlyEditingElement = (
    path: CollectionKey[] | null,
    newCancelOrKey?: (() => void) | 'key'
  ) => {
    const nextState: EditingState | null =
      path === null ? null : { path, mode: newCancelOrKey === 'key' ? 'key' : 'value' }

    // The "Cancel" function allows the UI to reset the element that was
    // previously being edited if the user clicks another "Edit" button
    // elsewhere
    if (currentlyEditingElement !== null && nextState !== null && cancelOp.current !== null) {
      cancelOp.current()
    }

    // Skip setState when the editing state is equivalent — avoids redundant
    // re-renders when callers re-issue the same edit target. React's `===`
    // bailout doesn't help here because nextState is a fresh object each call.
    if (!editingStatesEqual(nextState, currentlyEditingElement))
      setCurrentlyEditingElement(nextState)

    if (onEditEvent) onEditEvent(path, newCancelOrKey === 'key')
    cancelOp.current = typeof newCancelOrKey === 'function' ? newCancelOrKey : null
  }

  const areChildrenBeingEdited = (path: CollectionKey[]) =>
    currentlyEditingElement !== null && isDescendantOf(currentlyEditingElement.path, path)

  return (
    <EditingProviderContext.Provider
      value={{
        currentlyEditingElement,
        setCurrentlyEditingElement: updateCurrentlyEditingElement,
        areChildrenBeingEdited,
        previouslyEditedElement: previouslyEdited.current,
        setPreviouslyEditedElement: (path: CollectionKey[]) => {
          previouslyEdited.current = path
        },
        tabDirection: tabDirection.current,
        setTabDirection: (dir: TabDirection) => {
          tabDirection.current = dir
        },
        previousValue,
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
