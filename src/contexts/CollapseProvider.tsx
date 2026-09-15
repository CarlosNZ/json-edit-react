/**
 * Collapse broadcasts for the tree: whole-tree or subtree-targeted
 * expand/collapse driven from outside any specific node — the Opt-click
 * "Collapse All" / "Open All" gesture, and the `editorRef` handle's
 * `collapse(...)` method.
 *
 * Provider state is `{ commands, version }`; `setCollapseState(cmds)`
 * snapshots the commands and bumps `version`. Every `CollectionNode`
 * subscribes, and three things act on that state:
 *
 * 1. `useAppliedBroadcast` applies the last command matching this node, once
 *    per new `version`. Descendants that mount mid-cascade read the
 *    still-present commands on their first render, which is how "Open All"
 *    reaches past the initial mount frontier (#273).
 * 2. A changed `collapse` prop retires the broadcast: CollectionNode watches
 *    it with `useReferenceChanged` and calls `setCollapseState(null)`, since
 *    fresh consumer intent outranks a pending broadcast. Skipped on first
 *    mount, so the cascade above still works.
 * 3. User actions that mount a new `CollectionNode` also clear it, so the new
 *    node doesn't inherit a recent broadcast ("I just added an object, why is
 *    it collapsed?"). The call sites are `handleAdd` in CollectionNode and
 *    `handleChangeDataType` in ValueNodeWrapper. Programmatic `setData`
 *    doesn't clear: a user's expressed intent holds until the user changes it.
 *
 * State rather than pub-sub, because a pub-sub broadcast only reaches
 * subscribers mounted at broadcast time and misses every level past the mount
 * frontier (#273). The version counter makes "this is a new broadcast"
 * explicit, so re-issuing an identical command (Collapse-All twice) still
 * fires consumer effects — nothing guarantees a fresh `commands` array
 * reference to compare against.
 *
 * `commands` persists until the next broadcast overwrites it or something
 * clears it explicitly; there's no stale-clear timer. A cascade through a deep
 * tree spans many React commits, each potentially rendering thousands of
 * nodes, so no fixed timeout is both short enough to feel transient and long
 * enough to cover an arbitrarily large tree.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  type CollectionKey,
  type OnCollapseFunction,
  type CollapseState,
  type BuildNodeDataFromPathRef,
} from '../types'
import { toArray } from '../utils/misc'

interface CollapseContext {
  commands: CollapseState[] | null
  version: number
  setCollapseState: (collapseState: CollapseState | CollapseState[] | null) => void
}

const CollapseProviderContext = createContext<CollapseContext | null>(null)

interface CollapseProps {
  children: React.ReactNode
  onCollapse?: OnCollapseFunction
  buildNodeDataFromPathRef: BuildNodeDataFromPathRef
}

export const CollapseProvider = ({
  children,
  onCollapse,
  buildNodeDataFromPathRef,
}: CollapseProps) => {
  const [inner, setInner] = useState<{ commands: CollapseState[] | null; version: number }>({
    commands: null,
    version: 0,
  })

  // Keep the latest `onCollapse` in a ref, reassigned each render and read
  // lazily at call time, so an inline consumer callback doesn't churn
  // `setCollapseState` and therefore the context value — which would re-render
  // every CollectionNode on each parent render.
  const onCollapseRef = useRef(onCollapse)
  onCollapseRef.current = onCollapse

  const setCollapseState = useCallback(
    (state: CollapseState | CollapseState[] | null) => {
      if (state === null) {
        // Clearing doesn't bump `version`: nodes that already applied the
        // previous broadcast bail on the version check, and late mounts read
        // `commands === null` and use their default state.
        setInner((prev) =>
          prev.commands === null ? prev : { commands: null, version: prev.version }
        )
        return
      }
      const incoming = toArray(state)
      // Snapshot: the commands are retained in state and replayed to late
      // mounts, so a caller mutating the originals after dispatch must not
      // silently change the pending broadcast.
      const commands = incoming.map((cmd) => ({ ...cmd, path: [...cmd.path] }))
      setInner((prev) => ({ commands, version: prev.version + 1 }))
      // Fire the `onCollapse` observer once per command, with the node's flat
      // `NodeData` built from the live document plus the collapse flags.
      const onCollapse = onCollapseRef.current
      if (onCollapse)
        incoming.forEach((cmd) => {
          const nodeData = buildNodeDataFromPathRef.current?.(cmd.path)
          if (nodeData)
            onCollapse({
              ...nodeData,
              collapsed: cmd.collapsed,
              includeChildren: cmd.includeChildren,
            })
        })
    },
    // A stable ref object read lazily at call time, so listing it doesn't
    // churn `setCollapseState` or the context value.
    [buildNodeDataFromPathRef]
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

const doesCollapseStateMatchPath = (path: CollectionKey[], command: CollapseState): boolean => {
  if (!command.includeChildren)
    return command.path.length === path.length && command.path.every((part, i) => path[i] === part)

  // Subtree match: the node matches if its path begins with the command path.
  // Reflexive — the targeted root collapses too.
  for (const [index, value] of command.path.entries()) {
    if (value !== path[index]) return false
  }
  return true
}

/**
 * True on renders where `value` differs from the previous render by
 * `Object.is` (matching React's dep-array semantics), false on first render.
 * Not a deep comparison. The ref update happens in a `useEffect`, so a render
 * that re-runs without committing (concurrent or strict mode) reads the same
 * answer twice.
 *
 * Disambiguates "first mount" from "subsequent change" without wedging a flag
 * ref into the surrounding effect.
 */
export const useReferenceChanged = <T,>(value: T): boolean => {
  const ref = useRef(value)
  const changed = !Object.is(ref.current, value)
  useEffect(() => {
    ref.current = value
  })
  return changed
}

/**
 * Applies broadcast commands to a CollectionNode, firing exactly once per
 * broadcast via a `useRef`-tracked last-seen version. A newly-mounted
 * descendant starts at version 0, so its first render mismatches the current
 * `version` and applies the still-present command — the cascade past the mount
 * frontier described above.
 *
 * Last matching command wins. Calling `animateCollapse` more than once in a
 * single fire would close over render-time `collapsed` and mis-fire, since
 * React batches the `setCollapsed` between calls.
 *
 * `hasBeenOpenedRef.current` is set only when expanding: a collapse broadcast
 * must not flip the mount gate on a never-opened node, or its descendants
 * would mount on the next render and undo the optimisation that keeps them
 * unmounted.
 *
 * Deps are `[version, commands]` only. `path` and `animateCollapse` are closed
 * over and captured fresh on each fire. Listing them would re-fire on every
 * local collapse toggle and every parent re-render handing down a new data
 * ref — significant scheduling overhead on large trees, even though the
 * version check early-returns.
 */
export const useAppliedBroadcast = (
  path: CollectionKey[],
  hasBeenOpenedRef: React.RefObject<boolean>,
  animateCollapse: (collapse: boolean) => void
) => {
  const { commands, version } = useCollapse()
  const lastSeenVersionRef = useRef(0)
  useEffect(() => {
    if (version === lastSeenVersionRef.current) return
    lastSeenVersionRef.current = version
    if (!commands) return
    let lastMatching: CollapseState | undefined
    for (const cmd of commands) {
      if (doesCollapseStateMatchPath(path, cmd)) lastMatching = cmd
    }
    if (!lastMatching) return
    if (!lastMatching.collapsed) hasBeenOpenedRef.current = true
    animateCollapse(lastMatching.collapsed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, commands])
}
