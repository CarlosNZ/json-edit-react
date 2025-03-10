/**
 * Captures state that is required to be shared between nodes. In particular:
 * - global collapse state for triggering whole tree expansions/collapses
 * - the currently editing node (to ensure only one node at a time can be
 *   edited)
 * - the value of the node currently being dragged (so that the target it is
 *   dropped on can act on it)
 */

import React, { createContext, useContext, useRef, useState } from 'react'
import {
  type TabDirection,
  type CollectionKey,
  type JsonData,
  type OnEditEventFunction,
  type OnCollapseFunction,
  type CollapseState,
} from '../types'
import { toPathString } from '../helpers'

export interface DragSource {
  path: CollectionKey[] | null
  pathString: string | null
}

interface TreeStateContext {
  collapseState: CollapseState | CollapseState[] | null
  setCollapseState: (collapseState: CollapseState | CollapseState[] | null) => void
  getMatchingCollapseState: (path: CollectionKey[]) => CollapseState | null
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

const TreeStateProviderContext = createContext<TreeStateContext | null>(null)

interface TreeStateProps {
  children: React.ReactNode
  onEditEvent?: OnEditEventFunction
  onCollapse?: OnCollapseFunction
}

export const TreeStateProvider = ({ children, onEditEvent, onCollapse }: TreeStateProps) => {
  const [collapseState, setCollapseState] = useState<CollapseState | CollapseState[] | null>(null)
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
    if (onEditEvent) onEditEvent(path, newCancelOrKey === 'key')
    cancelOp.current = typeof newCancelOrKey === 'function' ? newCancelOrKey : null
  }

  // Returns the current "CollapseState" value to Collection Node if it matches
  // that node. If the current "CollapseState" is an array, will return the one
  // matching one
  const getMatchingCollapseState = (path: CollectionKey[]) => {
    if (Array.isArray(collapseState)) {
      for (const cs of collapseState) {
        if (doesCollapseStateMatchPath(path, cs)) return cs
      }
      return null
    }

    return doesCollapseStateMatchPath(path, collapseState) ? collapseState : null
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
          if (onCollapse && state !== null)
            if (Array.isArray(state)) {
              state.forEach((cs) => onCollapse(cs))
            } else onCollapse(state)
          // Reset after 2 seconds, which is enough time for all child nodes to
          // have opened/closed, but still allows collapse reset if data changes
          // externally
          if (state !== null) setTimeout(() => setCollapseState(null), 2000)
        },
        getMatchingCollapseState,
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

export const useTreeState = () => {
  const context = useContext(TreeStateProviderContext)
  if (!context) throw new Error('Missing Context Provider')
  return context
}

const doesCollapseStateMatchPath = (path: CollectionKey[], collapseState: CollapseState | null) => {
  if (collapseState === null) return false

  if (!collapseState.includeChildren)
    return (
      collapseState.path.every((part, index) => path[index] === part) &&
      collapseState.path.length === path.length
    )

  for (const [index, value] of collapseState.path.entries()) {
    if (value !== path[index]) return false
  }

  return true
}
