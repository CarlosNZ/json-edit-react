import React, { createContext, useContext, useState } from 'react'

interface CollapseContext {
  isAllCollapsed: boolean | null
  setCollapseAll: (open: boolean) => void
}
const initialContext: CollapseContext = {
  isAllCollapsed: null,
  setCollapseAll: () => {},
}

const CollapseProviderContext = createContext(initialContext)

export const CollapseProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAllCollapsed, setCollapseAll] = useState(null)

  return (
    <CollapseProviderContext.Provider value={{ isAllCollapsed, setCollapseAll }}>
      {children}
    </CollapseProviderContext.Provider>
  )
}

export const useCollapseAll = () => useContext(CollapseProviderContext)
