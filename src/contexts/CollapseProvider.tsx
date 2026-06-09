/**
 * Collapse broadcasts for the tree. Drives whole-tree (or subtree-targeted)
 * expand/collapse operations from outside any specific node — e.g. the
 * Opt-click "Collapse All" / "Open All" gesture, and the `editorRef`
 * handle's `collapse(...)` method.
 *
 * ## Contract surface
 *
 * Provider state is `{ commands, version }`. Every `setCollapseState(cmds)`
 * snapshots the commands and bumps `version`. Subscribers (every
 * `CollectionNode`) consume the state via three named contracts:
 *
 * 1. **Broadcast application** — `useAppliedBroadcast(path,
 *    hasBeenOpenedRef, animateCollapse)` walks `commands` once per new
 *    `version`, applies the last command whose path matches this node, and
 *    bails on subsequent renders via a version-mismatch check. Late mounts
 *    (descendants that mount as their parent expands during a cascade)
 *    read the still-present commands on their first render — that's what
 *    makes Opt-click "Open All" reach past the initial mount frontier
 *    (#273).
 *
 * 2. **Prop-change retires broadcast** — CollectionNode uses
 *    `useReferenceChanged(collapseFilter)` to detect when the consumer's
 *    derived `collapse` prop has changed. A change is fresher consumer
 *    intent than any pending broadcast, so the node calls
 *    `setCollapseState(null)` to retire the stale commands. Skipped on
 *    first mount — the cascade-through-frontier behavior above relies on
 *    freshly-mounted descendants seeing the still-set commands.
 *
 * 3. **User-action clears broadcast** — `setCollapseState(null)` is also
 *    called by user-driven actions that mount a new `CollectionNode` and
 *    don't want it to inherit a recent broadcast (otherwise "I just added
 *    a new object, why is it collapsed?"). Two call sites, both grep-able
 *    as `setCollapseState(null)`:
 *      - `handleAdd` in CollectionNode.tsx
 *      - `handleChangeDataType` in ValueNodeWrapper.tsx
 *    External programmatic `setData` doesn't go through these paths, so
 *    it still inherits — matches "user expressed an intent; external data
 *    changes should respect it until the user expresses otherwise."
 *
 * ## Why state, not pub-sub
 *
 * Pub-sub broadcasts only reach subscribers mounted at broadcast time. A
 * subtree-expand command targeting a not-yet-mounted descendant
 * (collapsed at load with `collapse={N}`) misses every level past the
 * mount frontier — see #273. With state, newly-mounted descendants read
 * the still-present command on their first render and cascade naturally.
 *
 * ## Why the version counter
 *
 * Re-broadcasting a command with identical content (Collapse-All, then
 * Collapse-All again) needs to re-fire consumer effects. Identity
 * comparison on the `commands` array alone isn't enough because nothing
 * guarantees a fresh array reference. The version counter makes "this is
 * a new broadcast" explicit; consumer effects compare against a
 * `useRef`-tracked last-seen value.
 *
 * No stale-clear timer. The cascade through a deep tree can take many
 * React commits, each of which may itself render thousands of nodes —
 * there's no fixed timer that's both short enough to feel transient and
 * long enough to cover the cascade on arbitrarily large trees. So
 * `commands` persists in state until the next broadcast overwrites it or
 * it's explicitly cleared via `setCollapseState(null)`.
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

  // Keep the latest `onCollapse` in a ref so an inline consumer callback (new
  // identity every render) doesn't churn `setCollapseState` — and therefore the
  // context value — which would re-render every `useCollapse` subscriber (i.e.
  // every CollectionNode) on each parent render. The ref is reassigned on every
  // render so it always holds the current prop; `setCollapseState` reads it
  // lazily at call time. Mirrors `onEditEventRef` in EditingProvider.
  const onCollapseRef = useRef(onCollapse)
  onCollapseRef.current = onCollapse

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
      // dispatch must not silently change the pending broadcast.
      const commands = incoming.map((cmd) => ({ ...cmd, path: [...cmd.path] }))
      setInner((prev) => ({ commands, version: prev.version + 1 }))
      // Fire the `onCollapse` observer once per command, carrying the node's
      // flat `NodeData` (built from the live document) plus the collapse flags.
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
    // `buildNodeDataFromPathRef` is a stable ref object (read lazily at call
    // time), so listing it doesn't churn `setCollapseState` / the context
    // value.
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

  // Subtree match: command targets all descendants of `command.path`. The
  // node matches if its own path begins with the command path (reflexive —
  // the targeted root itself collapses too).
  for (const [index, value] of command.path.entries()) {
    if (value !== path[index]) return false
  }
  return true
}

/**
 * Returns true on renders where `value` differs from the previous render
 * by `Object.is` (reference identity, matching React's `useEffect`
 * dep-array semantics). Returns false on first render. Not a deep
 * comparison — calling with a large data object would compare references
 * only, never contents. The ref-update happens in a `useEffect`, so a
 * render that re-runs without committing (concurrent mode, strict mode)
 * reads the same answer twice.
 *
 * Used to disambiguate "first mount" from "subsequent change" without
 * wedging a flag ref into the surrounding effect.
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
 * Applies broadcast commands to a CollectionNode. Reads `version` and
 * `commands` from the collapse context; uses a `useRef`-tracked last-seen
 * version to fire exactly once per broadcast. Newly-mounted descendants
 * start with `lastSeenVersionRef.current === 0`, so their first render
 * sees a mismatch against the current `version` and applies the
 * still-present command — that's how Opt-click "Open All" cascades past
 * the initial mount frontier (#273).
 *
 * Last-matching-wins: when an array of commands targets the same node
 * multiple times, only the last matching command is applied. Calling
 * `animateCollapse` more than once in the same effect fire would close
 * over render-time `collapsed` and mis-fire — React batches the
 * `setCollapsed` between calls, so the second sees stale state.
 *
 * `hasBeenOpenedRef.current` is set true only when expanding. A collapse
 * broadcast must not flip the mount gate on a never-opened node, or its
 * descendants would mount on the next render and undo the "don't mount
 * descendants of never-opened nodes" perf optimization.
 *
 * Effect deps are `[version, commands]` only. `path` and `animateCollapse`
 * are closed over and captured fresh on every fire — effects re-create
 * their closure on each run. Listing them would fire the effect on every
 * local collapse toggle and every parent re-render that hands down a new
 * data ref; on large trees that's significant React scheduling overhead
 * even though the version check would early-return.
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
