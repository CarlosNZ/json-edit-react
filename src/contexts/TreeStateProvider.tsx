/**
 * Captures state that is required to be shared between nodes. In particular:
 * - global collapse state for triggering whole tree expansions/closures
 * - the currently editing node (to ensure only one node at a time can be
 *   edited)
 * - the value of the node currently being dragged (so that the target it is
 *   dropped on can act on it)
 */

import React, { createContext, useContext, useRef, useState } from 'react'
import { type TabDirection, type CollectionKey, type JsonData } from '../types'
import { toPathString } from '../helpers'

interface CollapseAllState {
  path: CollectionKey[]
  collapsed: boolean
}

export interface DragSource {
  path: CollectionKey[] | null
  pathString: string | null
}

interface TreeStateContext {
  collapseState: CollapseAllState | null
  setCollapseState: (collapseState: CollapseAllState | null) => void
  doesPathMatch: (path: CollectionKey[]) => boolean
  currentlyEditingElement: string | null
  setCurrentlyEditingElement: (
    path: CollectionKey[] | string | null,
    cancelOpOrKey?: (() => void) | 'key'
  ) => void
  previouslyEditedElement: string | null
  setPreviouslyEditedElement: (path: string) => void
  areChildrenBeingEdited: (pathString: string) => boolean
  dragSource: DragSource
  setDragSource: (newState: DragSource) => void
  tabDirection: TabDirection
  setTabDirection: (dir: TabDirection) => void
  previousValue: JsonData | null
  setPreviousValue: (value: JsonData | null) => void
}
const initialContext: TreeStateContext = {
  collapseState: null,
  setCollapseState: () => {},
  doesPathMatch: () => false,
  currentlyEditingElement: null,
  setCurrentlyEditingElement: () => {},
  previouslyEditedElement: null,
  setPreviouslyEditedElement: () => {},
  areChildrenBeingEdited: () => false,
  dragSource: { path: null, pathString: null },
  setDragSource: () => {},
  tabDirection: 'next',
  setTabDirection: () => {},
  previousValue: null,
  setPreviousValue: () => {},
}

const TreeStateProviderContext = createContext(initialContext)

export const TreeStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [collapseState, setCollapseState] = useState<CollapseAllState | null>(null)
  const [currentlyEditingElement, setCurrentlyEditingElement] = useState<string | null>(null)

  // This value holds the "previous" value when user changes type. Because
  // changing data type causes a proper data update, cancelling afterwards
  // doesn't revert to the previous type. This value allows us to do that.
  const [previousValue, setPreviousValue] = useState<JsonData | null>(null)
  const [dragSource, setDragSource] = useState<DragSource>({
    path: null,
    pathString: null,
  })
  const cancelOp = useRef<(() => void) | null>(null)

  // tabDirection and previouslyEdited are used in Tab navigation. Each node can
  // find the "previous" or "next" node on Tab detection, but has no way to know
  // whether that node is actually visible or editable. So each node runs this
  // check on itself on render, and if it has been set to "isEditing" when it
  // shouldn't be, it immediately goes to the next (and the next, etc...). These
  // two values hold some state which is useful in this slightly messy process.
  const tabDirection = useRef<TabDirection>('next')
  const previouslyEdited = useRef<string | null>(null)

  const updateCurrentlyEditingElement = (
    path: CollectionKey[] | string | null,
    newCancelOrKey?: (() => void) | 'key'
  ) => {
    const pathString =
      typeof path === 'string' || path === null
        ? path
        : toPathString(path, newCancelOrKey === 'key' ? 'key_' : undefined)

    // The "Cancel" function allows the UI to reset the element that was
    // previously being edited if the user clicks another "Edit" button
    // elsewhere
    if (currentlyEditingElement !== null && pathString !== null && cancelOp.current !== null) {
      cancelOp.current()
    }
    setCurrentlyEditingElement(pathString)
    cancelOp.current = typeof newCancelOrKey === 'function' ? newCancelOrKey : null
  }

  const doesPathMatch = (path: CollectionKey[]) => {
    if (collapseState === null) return false

    for (const [index, value] of collapseState.path.entries()) {
      if (value !== path[index]) return false
    }

    return true
  }

  const areChildrenBeingEdited = (pathString: string) =>
    currentlyEditingElement !== null && currentlyEditingElement.includes(pathString)

  return (
    <TreeStateProviderContext.Provider
      value={{
        // Collapse
        collapseState,
        setCollapseState: (state) => {
          setCollapseState(state)
          // Reset after 2 seconds, which is enough time for all child nodes to
          // have opened/closed, but still allows collapse reset if data changes
          // externally
          if (state !== null) setTimeout(() => setCollapseState(null), 2000)
        },
        doesPathMatch,
        // Editing
        currentlyEditingElement,
        setCurrentlyEditingElement: updateCurrentlyEditingElement,
        areChildrenBeingEdited,
        previouslyEditedElement: previouslyEdited.current,
        setPreviouslyEditedElement: (path: string) => {
          previouslyEdited.current = path
        },
        tabDirection: tabDirection.current,
        setTabDirection: (dir: TabDirection) => {
          tabDirection.current = dir
        },
        previousValue,
        setPreviousValue,
        // Drag-n-drop
        dragSource,
        setDragSource,
      }}
    >
      {children}
    </TreeStateProviderContext.Provider>
  )
}

export const useTreeState = () => useContext(TreeStateProviderContext)
