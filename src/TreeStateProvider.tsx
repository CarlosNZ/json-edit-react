/**
 * Captures the collapse state and the editing state of the entire tree, as
 * nodes sometimes need to know the state of other (sibling or child) nodes
 */

import React, { createContext, useContext, useState } from 'react'
import { type CollectionKey } from './types'

interface CollapseAllState {
  path: CollectionKey[]
  open: boolean
}
interface TreeStateContext {
  collapseState: CollapseAllState | null
  setCollapseState: React.Dispatch<React.SetStateAction<CollapseAllState | null>>
  doesPathMatch: (path: CollectionKey[]) => boolean
  currentlyEditingElement: string | null
  setCurrentlyEditingElement: React.Dispatch<React.SetStateAction<string | null>>
  areChildrenBeingEdited: (pathString: string) => boolean
}
const initialContext: TreeStateContext = {
  collapseState: null,
  setCollapseState: () => {},
  doesPathMatch: () => false,
  currentlyEditingElement: null,
  setCurrentlyEditingElement: () => {},
  areChildrenBeingEdited: () => false,
}

const TreeStateProviderContext = createContext(initialContext)

export const TreeStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [collapseState, setCollapseState] = useState<CollapseAllState | null>(null)
  const [currentlyEditingElement, setCurrentlyEditingElement] = useState<string | null>(null)

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
        setCollapseState,
        doesPathMatch,
        // Editing
        currentlyEditingElement,
        setCurrentlyEditingElement,
        areChildrenBeingEdited,
      }}
    >
      {children}
    </TreeStateProviderContext.Provider>
  )
}

export const useTreeState = () => useContext(TreeStateProviderContext)
