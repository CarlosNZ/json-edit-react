/**
 * Collapse broadcasts for the tree. Used to trigger whole-tree (or
 * subtree-targeted) expand/collapse operations from outside any specific node.
 *
 * Pub-sub model: commands are broadcast imperatively to registered
 * subscribers, not held in React state. Each `CollectionNode` subscribes on
 * mount with a handler that matches the incoming command against its own
 * path. New mounts register and only receive *future* broadcasts — there's
 * no "current command" lingering anywhere to leak into nodes that mounted
 * after a Collapse-All click.
 *
 * `setCollapseState` performs zero React state updates: the provider never
 * re-renders on a broadcast. Consumers that don't subscribe see no churn at
 * all when collapse commands fire.
 */

import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react'
import { type CollectionKey, type OnCollapseFunction, type CollapseState } from '../types'

type CollapseCommandHandler = (cmd: CollapseState) => void

interface CollapseContext {
  subscribe: (handler: CollapseCommandHandler) => () => void
  setCollapseState: (collapseState: CollapseState | CollapseState[] | null) => void
}

const CollapseProviderContext = createContext<CollapseContext | null>(null)

interface CollapseProps {
  children: React.ReactNode
  onCollapse?: OnCollapseFunction
}

export const CollapseProvider = ({ children, onCollapse }: CollapseProps) => {
  const subscribersRef = useRef<Set<CollapseCommandHandler>>(new Set())

  const subscribe = useCallback((handler: CollapseCommandHandler) => {
    subscribersRef.current.add(handler)
    return () => {
      subscribersRef.current.delete(handler)
    }
  }, [])

  const setCollapseState = useCallback(
    (state: CollapseState | CollapseState[] | null) => {
      if (state === null) return
      const commands = Array.isArray(state) ? state : [state]
      commands.forEach((cmd) => {
        subscribersRef.current.forEach((handler) => handler(cmd))
        onCollapse?.(cmd)
      })
    },
    [onCollapse]
  )

  // Memoize so the context value reference is only fresh when its inputs
  // actually change. `subscribe` is stable for the provider's lifetime;
  // `setCollapseState` changes only when the consumer-supplied `onCollapse`
  // changes — which in practice is almost never.
  const value = useMemo(() => ({ subscribe, setCollapseState }), [subscribe, setCollapseState])

  return <CollapseProviderContext.Provider value={value}>{children}</CollapseProviderContext.Provider>
}

export const useCollapse = () => {
  const context = useContext(CollapseProviderContext)
  if (!context) throw new Error('Missing Collapse Context Provider')
  return context
}

export const doesCollapseStateMatchPath = (
  path: CollectionKey[],
  command: CollapseState
): boolean => {
  if (!command.includeChildren)
    return command.path.length === path.length && command.path.every((part, i) => path[i] === part)

  // Subtree match: command targets all descendants of `command.path`. The
  // node matches if its own path begins with the command path (reflexive —
  // the targeted root itself collapses too).
  for (const [index, value] of command.path.entries()) {
    if (value !== path[index]) return false
  }
  return true
}
