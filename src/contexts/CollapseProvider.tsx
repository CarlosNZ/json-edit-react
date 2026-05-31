/**
 * Collapse broadcasts for the tree. Used to trigger whole-tree (or
 * subtree-targeted) expand/collapse operations from outside any specific node.
 *
 * State-based broadcast with a version counter. Each call to
 * `setCollapseState` writes the command(s) into provider state and bumps
 * `version`. Subscribers (`CollectionNode`s) read both from context and
 * compare `version` to a `useRef`-tracked last-seen value to decide whether
 * to apply.
 *
 * Why a version counter: re-broadcasting a command with identical content
 * (e.g. Collapse-All, then Collapse-All again) needs to re-fire consumer
 * effects. Identity comparison on the `commands` array alone isn't enough
 * because nothing guarantees a fresh array reference. The version counter
 * makes "this is a new broadcast" explicit.
 *
 * Why state (not pub-sub): pub-sub broadcasts only reach subscribers mounted
 * at broadcast time. A subtree-expand command targeting a not-yet-mounted
 * descendant (collapsed-at-load with `collapse={N}`) misses every level past
 * the mount frontier — see #273. With state, newly-mounted descendants read
 * the still-present command on their first render and cascade naturally.
 *
 * No stale-clear timer. The cascade through a deep tree can take many React
 * commits, each of which may itself render thousands of nodes — there is no
 * fixed timer that's both short enough to feel like "the broadcast was
 * transient" and long enough to cover the cascade on arbitrarily large
 * trees. So we don't try: `commands` persists in state until the next
 * broadcast overwrites it or it's explicitly cleared via
 * `setCollapseState(null)`.
 *
 * `setCollapseState(null)` clears the pending broadcast (sets `commands` to
 * null without bumping `version`). This is used by user-driven actions that
 * mount new CollectionNodes — notably `handleAdd` and
 * `handleChangeDataType`. Without the clear, the new node would inherit the
 * still-set broadcast, which is surprising ("I just added a new object,
 * why is it collapsed?"). External programmatic `setData` doesn't go
 * through those paths, so it still inherits — which matches "user
 * expressed an intent; external data changes should respect it until the
 * user expresses otherwise."
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { type CollectionKey, type OnCollapseFunction, type CollapseState } from '../types'

interface CollapseContext {
  commands: CollapseState[] | null
  version: number
  setCollapseState: (collapseState: CollapseState | CollapseState[] | null) => void
}

const CollapseProviderContext = createContext<CollapseContext | null>(null)

interface CollapseProps {
  children: React.ReactNode
  onCollapse?: OnCollapseFunction
}

export const CollapseProvider = ({ children, onCollapse }: CollapseProps) => {
  const [inner, setInner] = useState<{ commands: CollapseState[] | null; version: number }>({
    commands: null,
    version: 0,
  })

  const setCollapseState = useCallback(
    (state: CollapseState | CollapseState[] | null) => {
      if (state === null) {
        // Clear the pending broadcast without bumping `version`. Nodes that
        // already applied the previous broadcast bail on the version check;
        // late mounts read `commands === null` and use their default state.
        setInner((prev) =>
          prev.commands === null ? prev : { commands: null, version: prev.version }
        )
        return
      }
      const incoming = Array.isArray(state) ? state : [state]
      // Snapshot the commands. They're retained in provider state and
      // replayed to late mounts — a caller mutating the originals after
      // dispatch must not silently change the pending broadcast. `onCollapse`
      // still receives the originals (the caller's identity).
      const commands = incoming.map((cmd) => ({ ...cmd, path: [...cmd.path] }))
      setInner((prev) => ({ commands, version: prev.version + 1 }))
      incoming.forEach((cmd) => onCollapse?.(cmd))
    },
    [onCollapse]
  )

  const value = useMemo(
    () => ({ commands: inner.commands, version: inner.version, setCollapseState }),
    [inner.commands, inner.version, setCollapseState]
  )

  return (
    <CollapseProviderContext.Provider value={value}>{children}</CollapseProviderContext.Provider>
  )
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
