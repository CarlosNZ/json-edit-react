/**
 * Collapse-broadcast state for the tree. Used to trigger whole-tree (or
 * subtree-targeted) expand/collapse operations from outside any specific node.
 *
 * Note: this is a Part-1 relocation of the existing logic — including the
 * `setTimeout(..., 2000)` reset that papers over the stale-mount problem.
 * Part 4 of the §4 refactor replaces the state-with-timer model with a pub-sub
 * broadcast that doesn't need the reset.
 */

import React, { createContext, useContext, useState } from 'react'
import { type CollectionKey, type OnCollapseFunction, type CollapseState } from '../types'

interface CollapseContext {
  collapseState: CollapseState | CollapseState[] | null
  setCollapseState: (collapseState: CollapseState | CollapseState[] | null) => void
  getMatchingCollapseState: (path: CollectionKey[]) => CollapseState | null
}

const CollapseProviderContext = createContext<CollapseContext | null>(null)

interface CollapseProps {
  children: React.ReactNode
  onCollapse?: OnCollapseFunction
}

export const CollapseProvider = ({ children, onCollapse }: CollapseProps) => {
  const [collapseState, setCollapseState] = useState<CollapseState | CollapseState[] | null>(null)

  // Returns the current "CollapseState" value to Collection Node if it matches
  // that node. If the current "CollapseState" is an array, will return the
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

  return (
    <CollapseProviderContext.Provider
      value={{
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
      }}
    >
      {children}
    </CollapseProviderContext.Provider>
  )
}

export const useCollapse = () => {
  const context = useContext(CollapseProviderContext)
  if (!context) throw new Error('Missing Collapse Context Provider')
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
