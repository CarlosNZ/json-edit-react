/**
 * Captures state that is required to be shared between nodes. In particular:
 * - global collapse state for triggering whole tree expansions/closures
 * - the currently editing node (to ensure only one node at a time can be
 *   edited)
 * - the value of the node currently being dragged (so that the target it is
 *   dropped on can act on it)
 */

import React, { createContext, useContext, useRef, useState } from 'react'
import { type CollectionKey } from '../types'
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
  setCurrentlyEditingElement: (path: CollectionKey[] | null, cancelOp?: () => void) => void
  areChildrenBeingEdited: (pathString: string) => boolean
  dragSource: DragSource
  setDragSource: (newState: DragSource) => void
}
const initialContext: TreeStateContext = {
  collapseState: null,
  setCollapseState: () => {},
  doesPathMatch: () => false,
  currentlyEditingElement: null,
  setCurrentlyEditingElement: () => {},
  areChildrenBeingEdited: () => false,
  dragSource: { path: null, pathString: null },
  setDragSource: () => {},
}

const TreeStateProviderContext = createContext(initialContext)

export const TreeStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [collapseState, setCollapseState] = useState<CollapseAllState | null>(null)
  const [currentlyEditingElement, setCurrentlyEditingElement] = useState<string | null>(null)
  const [dragSource, setDragSource] = useState<DragSource>({
    path: null,
    pathString: null,
  })
  const cancelOp = useRef<(() => void) | null>(null)

  const updateCurrentlyEditingElement = (path: CollectionKey[] | null, newCancel?: () => void) => {
    const pathString = path === null ? null : toPathString(path)
    // TO-DO: Ensure new element is definitely open
    // if (path !== null) setCollapseState({ path: path.slice(0, path.length - 1), collapsed: false })

    // The "Cancel" allows the UI to reset the element that was previously being
    // edited if the user clicks another "Edit" button elsewhere
    if (currentlyEditingElement !== null && pathString !== null && cancelOp.current !== null) {
      cancelOp.current()
    }
    setCurrentlyEditingElement(pathString)
    cancelOp.current = newCancel ?? null
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
