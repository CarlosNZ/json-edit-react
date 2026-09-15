/**
 * Editing + commit state for the tree, and the single control centre for the
 * edit lifecycle. The bundle holds:
 *
 * - `active`: the one open/held operation (only one node edits at a time).
 * - `settling`: in-flight optimistic commits, keyed by path-string → token, so
 *   a node can show a "settling" state and a resolving commit can tell whether
 *   it's still the live one (latest-edit-wins).
 *
 * The provider owns the commit pipeline: `submit()` runs the consumer's
 * `onUpdate` (optimistic by default; `hold()` gates), `apply()` is the single
 * "apply value + close editor + fire commit*" moment, and `reconcile()` settles
 * the result (token-gated). It fires every `onEditEvent`. The data-owner
 * (`JsonEditor`) performs the document mutation via the `CommitPrimitives` ref,
 * which keeps `setData`/`updateDataObject` out of the store while the store
 * owns the lifecycle.
 *
 * The state lives in a small external store (a mutable bundle plus a listener
 * `Set`) exposed through `useSyncExternalStore`, rather than in a context
 * value: every node reads editing state, and a context update re-renders every
 * consumer regardless of `React.memo`. The context value is the store object
 * itself — a stable reference — so `useContext` alone never re-renders.
 * Components subscribe to a derived PRIMITIVE slice via `useEditingSelector`,
 * so a node selecting `isEditing` for its own path re-renders only when that
 * boolean flips. Actions and imperative reads go through the non-subscribing
 * `useEditingStore`.
 */

import React, { createContext, useContext, useMemo, useRef, useSyncExternalStore } from 'react'
import {
  type CollectionKey,
  type OnEditEventFunction,
  type EditEvent,
  type EditingState,
  type EditOperation,
  type BuildNodeDataFromPathRef,
  type NodeData,
  type UpdateFunctionProps,
  type JsonData,
  type UpdateControl,
  type JerError,
} from '../types'
import { type AssignOptions } from '../utils/assign'
import { isDescendantOf, pathsEqual, toPathString } from '../utils/pathTools'
import { isThenable } from '../utils/misc'

type Token = number
type PathString = string

// How long an INSTANT op (delete/move/array-add) waits for `onUpdate` before
// applying optimistically. A faster result settles in place, so the node is
// never removed or relocated and a rejection's inline error renders on it.
// ~100ms is the "feels instant" perception threshold; a constant rather than a
// prop, to keep the API flat.
const OPTIMISTIC_DELAY_MS = 100

export interface EditingStateBundle {
  /** The one open/held operation (null = nothing active). */
  active: EditingState | null
  /** In-flight optimistic commits: path-string → the commit's token. */
  settling: Record<PathString, Token>
}

/** A commit to perform, discriminated by `op`. `path` is the target/source. */
export type CommitRequest =
  | { op: 'edit'; path: CollectionKey[]; value: unknown }
  // `path` is the COLLECTION being added into (the add session + events live
  // there); `key` is the new child's key/index (the commit targets
  // `[...path, key]`).
  | {
      op: 'add'
      path: CollectionKey[]
      key: CollectionKey
      value: unknown
      options?: AssignOptions
    }
  | { op: 'delete'; path: CollectionKey[] }
  | { op: 'rename'; path: CollectionKey[]; newKey: CollectionKey }
  | {
      op: 'move'
      path: CollectionKey[]
      to: { path: CollectionKey[]; position: 'above' | 'below' }
    }

/** The normalised result of a settled commit. `JsonEditor`'s `runUpdate` maps
 *  `onUpdate`'s raw return (incl. localised reject messages) to this. */
export type UpdateOutcome =
  | { status: 'commit' }
  // `path` is where the override applies: `[]` for a whole-document `{ data }`
  // override, or the edited node's path for a node-level `{ value }` override.
  // `runUpdate` resolves it (it knows the event + node); `reconcile` just
  // applies.
  | { status: 'override'; value: JsonData; path: CollectionKey[] }
  | { status: 'cancel' }
  | { status: 'error'; error: JerError }

/**
 * What `buildCommit` returns: the `onUpdate` input plus apply/revert thunks.
 */
export interface BuiltCommit {
  input: UpdateFunctionProps
  /** Frozen `NodeData` snapshot for the
   *  `commit*`/`updateSuccess`/`updateError` events, captured per-op at build
   *  time (delete/rename describe the pre-apply node, add the child). The live
   *  document mutates before those events fire, so re-deriving from it would
   *  describe the wrong node or throw on a vanished path. */
  nodeData: NodeData
  /** True for an unchanged-value edit — skip `onUpdate`/settlement entirely. */
  isNoOp: boolean
  /** Optimistic `setData` for this op. */
  apply: () => void
  /** Per-path inverse, so a late failure reverts the right node without
   *  clobbering concurrent commits to other paths. Reads the live document. */
  revert: () => void
  /** Terminal-event extras (rename carries `oldKey`/`newKey`). */
  extra?: { oldKey?: CollectionKey; newKey?: CollectionKey }
}

/**
 * Document-mutation primitives supplied by the data-owner (`JsonEditor`) via a
 * ref. The store calls these from the commit engine; it never touches
 * `setData`/`updateDataObject` itself.
 */
export interface CommitPrimitives {
  /** Run the consumer's `onUpdate` and normalise its result to an outcome.
   *  Returns synchronously when `onUpdate` does, a promise only when it's
   *  async — the engine skips the optimistic apply for a synchronous verdict.
   *  `undefined` when no `onUpdate` was supplied, which also skips the
   *  settlement phase (no `update*` events). */
  runUpdate?: (
    input: UpdateFunctionProps,
    control: UpdateControl
  ) => UpdateOutcome | Promise<UpdateOutcome>
  /** Prepare a commit (compute `newData`, the input, and apply/revert).
   *  `null` if the target path doesn't exist. */
  buildCommit: (request: CommitRequest) => BuiltCommit | null
  /** Apply an arbitrary value at `path`, for `{ value }`/`{ data }` overrides
   *  (node path or root `[]` respectively). */
  applyValue: (path: CollectionKey[], value: unknown) => void
}

/** Arguments to `submit()` — the one commit entry point the nodes call. */
export type SubmitArgs = CommitRequest & {
  /**
   * Instant ops (delete, array-add, move): no `start*`/`submit*`, no session.
   */
  instant?: boolean
  /** Runs inside `apply()`, right after `commit*` (Tab passes `open(next)`). */
  onCommit?: () => void
}

interface OpenOptions {
  op?: EditOperation
  cancelOp?: () => void
  // Commit-on-displace: when this session is displaced by opening another
  // node, commit its buffer instead of cancelling, with `onCommit` = "open the
  // new node". The node must forward to its LIVE commit handler, since a stale
  // closure would commit the empty initial buffer. An invalid or blocked
  // commit must not call `onCommit`: that leaves this session open and blocks
  // the switch. Sessions that omit this (e.g. object-add) cancel on displace.
  commitOp?: (onCommit: () => void) => void
  // Imperative (handle-driven) edit, overriding `allowEdit`. See
  // `EditingState.force`.
  force?: boolean
}

// Phase-specific event for an operation. `delete`/`move` only ever fire at
// commit.
type Phase = 'start' | 'submit' | 'commit' | 'cancel'
const EVENT_FOR_OP: Record<EditOperation, Partial<Record<Phase, EditEvent['event']>>> = {
  edit: { start: 'startEdit', submit: 'submitEdit', cancel: 'cancelEdit', commit: 'commitEdit' },
  add: { start: 'startAdd', submit: 'submitAdd', cancel: 'cancelAdd', commit: 'commitAdd' },
  rename: {
    start: 'startRename',
    submit: 'submitRename',
    cancel: 'cancelRename',
    commit: 'commitRename',
  },
  delete: { commit: 'delete' },
  move: { commit: 'move' },
}
const eventForOp = (op: EditOperation, phase: Phase): EditEvent['event'] | null =>
  EVENT_FOR_OP[op][phase] ?? null

// Two sessions target the "same thing" when path + op match (phase may differ:
// an `editing` session that becomes `held` is still the same session).
const sameSession = (a: EditingState | null, b: EditingState | null) =>
  a !== null && b !== null && a.op === b.op && pathsEqual(a.path, b.path)

export interface EditingStore {
  subscribe: (onChange: () => void) => () => void
  getSnapshot: () => EditingStateBundle
  getServerSnapshot: () => EditingStateBundle
  /** Open an inline edit/rename/add session (`active.phase = 'editing'`). */
  open: (path: CollectionKey[], options?: OpenOptions) => void
  /** Abort the active session — runs its cleanup and fires `cancel*`. */
  cancel: () => void
  /** Run the full commit pipeline (optimistic by default; `hold()` gates).
   *  Resolves with the settlement outcome, or `undefined` for a no-op or when
   *  there's no `onUpdate`, so the calling node can report errors via its own
   *  `onError`. */
  submit: (args: SubmitArgs) => Promise<UpdateOutcome | undefined>
  /** Imperative read for event handlers — does not subscribe. */
  areChildrenBeingEdited: (path: CollectionKey[]) => boolean
}

const initialState: EditingStateBundle = {
  active: null,
  settling: {},
}

const createEditingStore = (
  onEditEventRef: React.RefObject<OnEditEventFunction | undefined>,
  buildNodeDataFromPathRef: BuildNodeDataFromPathRef,
  commitRef: React.RefObject<CommitPrimitives | undefined>
): EditingStore => {
  let state = initialState
  const listeners = new Set<() => void>()

  // Cleanup for the editing-phase session's local UI buffer, run when that
  // session is displaced (a switch) or cancelled (Esc/✗/external). A closure
  // var rather than state, so installing or clearing it never notifies.
  let cancelOp: (() => void) | null = null

  // Commit-on-displace callback for the active editing session (see
  // `OpenOptions.commitOp`). Shares `cancelOp`'s lifecycle: registered by
  // `installSession`, cleared on every session-ending transition.
  let commitOp: ((onCommit: () => void) => void) | null = null

  // Re-entrancy guard: a registered `cancelOp` may itself route back through
  // `cancel()`; the recursive call no-ops so the outer flow owns the single
  // state-clear + single cancel* emission.
  let cancelling = false

  // Monotonic per-commit identity. A resolving commit acts only if it's still
  // the current token for its path (`settling[path] === token`); otherwise a
  // newer commit superseded it and the stale result is ignored.
  let nextToken = 0

  const emit = () => listeners.forEach((listener) => listener())

  // Replace the bundle and notify. The per-action equality guards below avoid
  // emitting on no-op transitions.
  const commit = (next: EditingStateBundle) => {
    state = next
    emit()
  }

  // Fire an `onEditEvent` from a prebuilt `NodeData` payload. `extra` carries
  // the rename keys, or the settlement `operation`/`error`.
  const emitEvent = (
    nodeData: NodeData,
    event: EditEvent['event'],
    extra?: Record<string, unknown>
  ) => {
    onEditEventRef.current?.({ ...nodeData, ...extra, event } as EditEvent)
  }

  // Fire an `onEditEvent`, building `NodeData` from the LIVE document at
  // `path`. For pre-apply events (start*/submit*/cancel*); committed ops go
  // through `emitEvent` with the frozen `BuiltCommit.nodeData`.
  const fireEditEvent = (
    path: CollectionKey[],
    event: EditEvent['event'],
    extra?: Record<string, unknown>
  ) => {
    if (!onEditEventRef.current) return
    let nodeData: NodeData | undefined
    try {
      nodeData = buildNodeDataFromPathRef.current?.(path)
    } catch {
      // The path is gone from the live document — e.g. the consumer swapped
      // the whole `data` out from under an open edit, unmounting its node.
      // `buildNodeData` → `extract` throws on the missing path, so there's no
      // node to describe: skip the event and clear `active`. Clearing is the
      // load-bearing part, since a dangling `active` makes the next
      // open()/cancel() rebuild the same vanished path and throw here again,
      // wedging all further editing.
      commit({ ...state, active: null })
      cancelOp = null
      commitOp = null
      return
    }
    if (nodeData) emitEvent(nodeData, event, extra)
  }

  const setActive = (active: EditingState | null) => {
    if (sameSession(state.active, active) && state.active?.phase === active?.phase) return
    commit({ ...state, active })
  }

  // Install a new editing session: register its UI-cleanup and
  // commit-on-displace callbacks, make it active, and fire `start*`. Separate
  // from `open()` so the commit-on-displace path can defer it into the
  // outgoing commit's `onCommit` — opening the new node only once the previous
  // one has committed — without `open()` re-entering itself.
  const installSession = (next: EditingState, options?: OpenOptions) => {
    cancelOp = options?.cancelOp ?? null
    commitOp = options?.commitOp ?? null
    setActive(next)
    const startEvent = eventForOp(next.op, 'start')
    if (startEvent) fireEditEvent(next.path, startEvent)
  }

  // ── open: start an inline editing session ────────────────────────────────
  const open = (path: CollectionKey[], options?: OpenOptions) => {
    // Blocked while a held op is mid-gate (one operation at a time).
    if (state.active?.phase === 'held') return

    const op = options?.op ?? 'edit'
    const next: EditingState = { path, op, phase: 'editing', force: options?.force }
    const prev = state.active
    const isSwitch = prev !== null && !sameSession(prev, next)

    // Commit-on-displace behaves like Tab: commit the outgoing buffer, then
    // open the new node from inside the commit's `onCommit` (synchronous for
    // editor ops, so it still feels instant). A blocked or invalid commit never
    // calls `onCommit`, so the switch is blocked and the outgoing session stays
    // open with its error, keeping its `commitOp`/`cancelOp` registered for a
    // retry — a genuine commit clears them in `apply()` or the no-op branch.
    if (isSwitch && commitOp) {
      commitOp(() => installSession(next, options))
      return
    }

    // Otherwise — first open, same session, or a session that opted out of
    // commit-on-displace (e.g. object-add) — run the outgoing session's UI
    // cleanup, fire cancel* for it, then install the new session.
    const op0 = cancelOp
    cancelOp = null
    commitOp = null
    if (op0) op0()

    // Fire cancel* unless the cleanup already tore the session down by routing
    // through `cancel()` — `state.active` still pointing at `prev` means it
    // didn't. A displaced session is always `editing`-phase here (a `held` one
    // returns above), so it was never committed and discarding it is correct.
    if (isSwitch && sameSession(state.active, prev)) {
      const cancelEvent = eventForOp(prev.op, 'cancel')
      if (cancelEvent) fireEditEvent(prev.path, cancelEvent)
    }

    installSession(next, options)
  }

  // ── cancel: abort the active session (true user/external cancel) ──────────
  const cancel = () => {
    if (cancelling) return
    // A held op resolves only through its gate — the in-flight `onUpdate`
    // promise can't be aborted — so an external cancel is inert against it.
    if (state.active?.phase === 'held') return
    const prev = state.active
    cancelling = true
    try {
      const op0 = cancelOp
      cancelOp = null
      commitOp = null
      if (op0) op0()
      if (prev !== null) {
        if (state.active !== null) commit({ ...state, active: null })
        const cancelEvent = eventForOp(prev.op, 'cancel')
        if (cancelEvent) fireEditEvent(prev.path, cancelEvent)
      }
    } finally {
      cancelling = false
    }
  }

  const addSettling = (pathStr: PathString, token: Token) =>
    commit({ ...state, settling: { ...state.settling, [pathStr]: token } })

  const dropSettling = (pathStr: PathString) => {
    if (!(pathStr in state.settling)) return
    const rest = { ...state.settling }
    delete rest[pathStr]
    commit({ ...state, settling: rest })
  }

  // ── submit: the one commit pipeline ───────────────────────────────────────
  const submit = (request: SubmitArgs) => {
    const { op, path, instant, onCommit } = request
    const prims = commitRef.current
    let built: BuiltCommit | null
    try {
      built = prims?.buildCommit(request) ?? null
    } catch {
      // The target path vanished — e.g. a commit-on-displace fired for a
      // session whose node unmounted because the consumer swapped `data`.
      // Nothing to commit and no node to describe, so abandon the session
      // quietly (no submit*/commit*) but still run `onCommit`, so a displace or
      // Tab opens the next node rather than wedging on the gone path.
      if (sameSession(state.active, { path, op, phase: 'editing' }))
        commit({ ...state, active: null })
      cancelOp = null
      commitOp = null
      onCommit?.()
      return Promise.resolve(undefined)
    }
    const extra = built?.extra
    const pathStr = toPathString(path)
    const token = ++nextToken

    if (!instant) {
      const submitEvent = eventForOp(op, 'submit')
      if (submitEvent) fireEditEvent(path, submitEvent)
    }

    // No-op edit (unchanged value): close the session and fire commit*, with
    // no `onUpdate`, settlement or update*. Still runs `onCommit`, so a Tab off
    // an untouched field advances to the next node.
    if (!built || built.isNoOp) {
      if (sameSession(state.active, { path, op, phase: 'editing' }))
        commit({ ...state, active: null })
      cancelOp = null
      commitOp = null
      const commitEvent = eventForOp(op, 'commit')
      if (commitEvent) {
        // A genuine no-op has a `built` snapshot to fire; otherwise the target
        // is gone, so rebuild from the live path on a best-effort basis.
        if (built) emitEvent(built.nodeData, commitEvent, extra)
        else fireEditEvent(path, commitEvent, extra)
      }
      onCommit?.()
      return Promise.resolve(undefined)
    }

    const { input, nodeData, apply: applyDoc, revert } = built
    const hasUpdate = !!prims?.runUpdate
    let applied = false
    let held = false

    const apply = () => {
      if (applied) return
      applied = true
      applyDoc()
      // Close the originating session. `sameSession` is phase-agnostic, so it
      // matches both an `editing` submit and the release of a `held` op. Both
      // callbacks must be cleared BEFORE `onCommit` runs, since a
      // commit-on-displace `onCommit` opens the next node and registers its
      // own.
      cancelOp = null
      commitOp = null
      if (sameSession(state.active, { path, op, phase: 'editing' }))
        commit({ ...state, active: null })
      if (hasUpdate) addSettling(pathStr, token)
      const commitEvent = eventForOp(op, 'commit')
      // Frozen snapshot: the live document has just mutated (delete/rename
      // destroy the node identity at `path`), so rebuilding from it would
      // describe the wrong node or throw.
      if (commitEvent) emitEvent(nodeData, commitEvent, extra)
      onCommit?.()
    }

    const control: UpdateControl = {
      hold: () => {
        held = true
        // Mark the session held, blocking the tree. Instant ops have no prior
        // session, so create one; editor ops flip their phase to 'held'.
        commit({ ...state, active: { path, op, phase: 'held', force: state.active?.force } })
        return () => apply()
      },
    }

    if (!hasUpdate) {
      // No consumer `onUpdate`: apply optimistically, with no settlement.
      apply()
      return Promise.resolve(undefined)
    }

    const result = prims!.runUpdate!(input, control)
    const isAsync = isThenable(result)

    // Synchronous verdict on an editor op: the outcome is known in this tick,
    // so skip the optimistic apply entirely. `reconcile` applies for
    // commit/override and stays put for error/cancel, so a synchronous reject
    // never writes to `setData` — no value-flash, clean undo history. Held and
    // instant ops take the optimistic/timer path below instead: instant ops
    // pre-empt a sync reject via the timer, and a `hold()` gate is async by
    // design.
    if (!held && !instant && !isAsync) {
      return Promise.resolve(
        reconcile(path, op, token, result, apply, revert, () => applied, nodeData, extra)
      )
    }

    // Editor ops (edit/rename/object-add) apply immediately: the node survives
    // a later revert, so a rejection's inline error still shows, and Tab/close
    // must feel instant. Instant ops (delete/move/array-add) defer the
    // optimistic apply by OPTIMISTIC_DELAY_MS, so that an `onUpdate` settling
    // within that window leaves the node in place to render its inline error.
    // A slower `onUpdate` still applies optimistically once the timer fires.
    const promise = isAsync ? result : Promise.resolve(result)
    let optimisticTimer: ReturnType<typeof setTimeout> | undefined
    if (!held) {
      if (instant) optimisticTimer = setTimeout(apply, OPTIMISTIC_DELAY_MS)
      else apply()
    }

    return promise.then((outcome) => {
      clearTimeout(optimisticTimer)
      return reconcile(path, op, token, outcome, apply, revert, () => applied, nodeData, extra)
    })
  }

  // ── reconcile: settle the commit's outcome (token-gated) ──────────────────
  // Positional args rather than an options object: this is once-called internal
  // plumbing, and positional params minify where object keys don't.
  const reconcile = (
    path: CollectionKey[],
    op: EditOperation,
    token: Token,
    outcome: UpdateOutcome,
    apply: () => void,
    revert: () => void,
    applied: () => boolean,
    nodeData: NodeData,
    extra?: { oldKey?: CollectionKey; newKey?: CollectionKey }
  ): UpdateOutcome | undefined => {
    const pathStr = toPathString(path)

    // Pre-apply: this resolve IS the apply/close moment. Two paths land here
    // without an optimistic apply — a held gate releasing, or a synchronous
    // editor-op verdict (the sync fast-path in `submit`).
    if (!applied()) {
      if (outcome.status === 'cancel' || outcome.status === 'error') {
        // Declined or rejected before applying, so close the still-open
        // session — a 'held' gate, or an 'editing' session left open by the
        // sync fast-path. Closing lets the node revert and report the error
        // (`settleEdit` sees `active === null`), as the post-apply revert does.
        if (
          state.active &&
          pathsEqual(state.active.path, path) &&
          (state.active.phase === 'held' || state.active.phase === 'editing')
        ) {
          commit({ ...state, active: null })
          cancelOp = null
          commitOp = null
        }
        const cancelEvent = eventForOp(op, 'cancel')
        if (cancelEvent) emitEvent(nodeData, cancelEvent)
        if (outcome.status === 'error')
          emitEvent(nodeData, 'updateError', { operation: op, error: outcome.error })
        return outcome
      }
      apply()
    }

    // Token gate: a newer commit for this path has superseded this one. Ignore
    // it silently and report `undefined`, so the originating node treats the
    // stale resolve as a no-op — it must not revert its buffer or show an
    // error, since the live commit owns the node.
    if (state.settling[pathStr] !== token) return undefined
    dropSettling(pathStr)

    // Settlement events use the frozen snapshot: a revert has just mutated the
    // live document, and an add's child path doesn't exist there.
    switch (outcome.status) {
      case 'cancel':
        revert() // silent cancel after an optimistic apply
        break
      case 'error':
        revert()
        emitEvent(nodeData, 'updateError', { operation: op, error: outcome.error })
        break
      case 'override':
        // `outcome.path` is `[]` for a whole-document `{ data }` return, or
        // the edited node's path for a node-level `{ value }` return;
        // `runUpdate` has already resolved which.
        commitRef.current?.applyValue(outcome.path, outcome.value)
        emitEvent(nodeData, 'updateSuccess', { operation: op, ...extra })
        break
      case 'commit':
        emitEvent(nodeData, 'updateSuccess', { operation: op, ...extra })
        break
    }
    return outcome
  }

  return {
    subscribe: (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    getSnapshot: () => state,
    getServerSnapshot: () => state,
    open,
    cancel,
    submit,
    areChildrenBeingEdited: (path) =>
      state.active !== null && isDescendantOf(state.active.path, path),
  }
}

const EditingProviderContext = createContext<EditingStore | null>(null)

interface EditingProps {
  children: React.ReactNode
  onEditEvent?: OnEditEventFunction
  buildNodeDataFromPathRef: BuildNodeDataFromPathRef
  commitRef: React.RefObject<CommitPrimitives | undefined>
}

export const EditingProvider = ({
  children,
  onEditEvent,
  buildNodeDataFromPathRef,
  commitRef,
}: EditingProps) => {
  // Keep the latest `onEditEvent` in a ref so an inline consumer callback
  // doesn't force the store to be recreated. Read only at event time.
  const onEditEventRef = useRef(onEditEvent)
  onEditEventRef.current = onEditEvent

  // Created once, so the context value is a stable reference. All three refs
  // are read only at event time, after `Editor` has populated the accessors.
  const storeRef = useRef<EditingStore | null>(null)
  if (storeRef.current === null)
    storeRef.current = createEditingStore(onEditEventRef, buildNodeDataFromPathRef, commitRef)

  return (
    <EditingProviderContext.Provider value={storeRef.current}>
      {children}
    </EditingProviderContext.Provider>
  )
}

/** Returns the (stable) store. Use for actions and imperative reads — no
 * subscription. */
export const useEditingStore = (): EditingStore => {
  const store = useContext(EditingProviderContext)
  if (!store) throw new Error('Missing Editing Context Provider')
  return store
}

// A selector may only return a primitive: primitives are `Object.is`-stable,
// so a component re-renders only when the selected value actually changes.
type EditingSelection = string | number | boolean | bigint | symbol | null | undefined

/**
 * Subscribe to a derived PRIMITIVE slice of editing state. The `T extends
 * EditingSelection` bound enforces that at compile time: a selector returning a
 * fresh object or array won't type-check, and would re-render on every emit.
 */
export const useEditingSelector = <T extends EditingSelection>(
  selector: (state: EditingStateBundle) => T
): T => {
  const store = useEditingStore()
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getSnapshot()),
    () => selector(store.getServerSnapshot())
  )
}

/**
 * Whole-bundle hook: the full state plus the (stable) actions. It wakes on
 * every edit transition, so keep it off the per-node hot path — use
 * `useEditingSelector` there.
 */
export const useEditing = () => {
  const store = useEditingStore()
  const bundle = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
  return useMemo(
    () => ({
      ...bundle,
      open: store.open,
      cancel: store.cancel,
      submit: store.submit,
      areChildrenBeingEdited: store.areChildrenBeingEdited,
    }),
    [bundle, store]
  )
}
