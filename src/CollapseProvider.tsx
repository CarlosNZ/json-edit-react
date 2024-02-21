import React, { createContext, useContext, useState } from 'react'
import { CollectionKey } from './types'

interface CollapseAllState {
  path: CollectionKey[]
  open: boolean
}
interface CollapseContext {
  collapseState: CollapseAllState | null
  setCollapseState: React.Dispatch<React.SetStateAction<CollapseAllState | null>>
  doesPathMatch: (path: CollectionKey[]) => boolean
}
const initialContext: CollapseContext = {
  collapseState: null,
  setCollapseState: () => {},
  doesPathMatch: () => false,
}

const CollapseProviderContext = createContext(initialContext)

export const CollapseProvider = ({ children }: { children: React.ReactNode }) => {
  const [collapseState, setCollapseState] = useState<CollapseAllState | null>(null)

  const doesPathMatch = (path: CollectionKey[]) => {
    if (collapseState === null) return false

    for (const [index, value] of collapseState.path.entries()) {
      if (value !== path[index]) return false
    }

    return true
  }

  return (
    <CollapseProviderContext.Provider value={{ collapseState, setCollapseState, doesPathMatch }}>
      {children}
    </CollapseProviderContext.Provider>
  )
}

export const useCollapseAll = () => useContext(CollapseProviderContext)
