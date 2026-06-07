/**
 * Editing + commit state for the tree. This store is the single control centre
 * for the whole edit lifecycle (§ EditingModel-new.md):
 *
 * - `active`: the one open/held operation (only one node edits at a time).
 * - `settling`: the in-flight optimistic commits, keyed by path-string → token,
 *   so a node can show a "settling" state and a resolving commit can tell whether
 *   it's still the live one (latest-edit-wins).
 * - Tab-navigation bookkeeping (direction + previously-edited path).
 *
 * The Provider OWNS the commit pipeline: `submit()` runs the consumer's
 * `onUpdate` (optimistic by default; `hold()` gates), `apply()` is the single
 * "apply value + close editor + fire commit*" moment, and `reconcile()` settles
 * the result (token-gated). It fires EVERY `onEditEvent`. The data-owner
 * (`JsonEditor`) supplies the actual document mutation via the `CommitPrimitives`
 * ref — this keeps the store free of `setData`/`updateDataObject` while owning
 * the lifecycle.
 *
 * ## Why an external store (not useState + context value)
 *
 * Every node reads editing state, so with a plain context value any edit
 * transition re-rendered *every* consumer (`React.memo` can't stop a context
 * update). Instead the state lives in a tiny external store (a mutable bundle +
 * a listener `Set`), exposed through `useSyncExternalStore`. The context value
 * is the store object itself — a stable reference — so `useContext` alone never
 * re-renders. Components subscribe to a derived PRIMITIVE *slice* via
 * `useEditingSelector`; a node selecting `isEditing` for its own path re-renders
 * only when that boolean flips. Actions/imperative reads go through the
 * non-subscribing `useEditingStore`.
 *
 * `useEditing` remains as a whole-bundle compatibility hook (slice-isolation
 * test); it wakes on every change, so never use it on the per-node hot path.
 */

import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react'
import {
  type TabDirection,
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
  type JsonEditorError,
} from '../types'
import { type AssignOptions } from '../utils/assign'
import { isDescendantOf, pathsEqual, toPathString } from '../utils/pathTools'

type Token = number
type PathString = string

export interface EditingStateBundle {
  /** The one open/held operation (null = nothing active). */
  active: EditingState | null
  /** In-flight optimistic commits: path-string → the commit's token. */
  settling: Record<PathString, Token>
  previouslyEditedElement: CollectionKey[] | null
  tabDirection: TabDirection
}

/** A commit to perform, discriminated by `op`. `path` is the target/source. */
export type CommitRequest =
  | { op: 'edit'; path: CollectionKey[]; value: unknown }
  // `path` is the COLLECTION being added into (the add session + events live
  // there); `key` is the new child's key/index (the commit targets `[...path, key]`).
  | { op: 'add'; path: CollectionKey[]; key: CollectionKey; value: unknown; options?: AssignOptions }
  | { op: 'delete'; path: CollectionKey[] }
  | { op: 'rename'; path: CollectionKey[]; newKey: CollectionKey }
  | { op: 'move'; path: CollectionKey[]; to: { path: CollectionKey[]; position: 'above' | 'below' } }

/** The normalised result of a settled commit. `JsonEditor`'s `runUpdate` maps
 *  `onUpdate`'s raw return (incl. localised reject messages) to this. */
export type UpdateOutcome =
  | { status: 'commit' }
  | { status: 'override'; value: JsonData }
  | { status: 'cancel' }
  | { status: 'error'; error: JsonEditorError }

/** What `buildCommit` returns: the `onUpdate` input plus apply/revert thunks. */
export interface BuiltCommit {
  input: UpdateFunctionProps
  /** Flat `NodeData` snapshot for the `commit*`/`updateSuccessful`/`updateError`
   *  events, captured at build time per-op (delete/rename describe the PRE-apply
   *  node, add the child). Frozen so the event fires the committed identity even
   *  though the live document has since mutated (or been reverted) — re-deriving
   *  from the live doc would describe the wrong node or throw on a vanished path. */
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
   *  `undefined` when no `onUpdate` was supplied (the engine then skips the
   *  settlement phase — no `update*`). */
  runUpdate?: (input: UpdateFunctionProps, control: UpdateControl) => Promise<UpdateOutcome>
  /** Prepare a commit (compute `newData`, the input, and apply/revert). `null`
   *  if the target path no longer exists. */
  buildCommit: (request: CommitRequest) => BuiltCommit | null
  /** Apply an arbitrary value at `path` (used for an `{ value }` override). */
  applyValue: (path: CollectionKey[], value: unknown) => void
}

/** Arguments to `submit()` — the one commit entry point the nodes call. */
export type SubmitArgs = CommitRequest & {
  /** Instant ops (delete, array-add, move): no `start*`/`submit*`, no session. */
  instant?: boolean
  /** Runs inside `apply()`, right after `commit*` (Tab passes `open(next)`). */
  onCommit?: () => void
}

interface OpenOptions {
  op?: EditOperation
  cancelOp?: () => void
  // Imperative (handle-driven) edit — overrides `allowEdit`. See `EditingState.force`.
  force?: boolean
}

// Phase-specific event for an operation. `delete`/`move` only ever fire at commit.
const eventForOp = (
  op: EditOperation,
  phase: 'start' | 'submit' | 'commit' | 'cancel'
): EditEvent['event'] | null => {
  if (op === 'delete') return phase === 'commit' ? 'delete' : null
  if (op === 'move') return phase === 'commit' ? 'move' : null
  const suffix = op === 'rename' ? 'Rename' : op === 'add' ? 'Add' : 'Edit'
  if (phase === 'start') return `start${suffix}` as EditEvent['event']
  if (phase === 'submit') return `submit${suffix}` as EditEvent['event']
  if (phase === 'cancel') return `cancel${suffix}` as EditEvent['event']
  return `commit${suffix}` as EditEvent['event']
}

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
   *  Resolves with the settlement outcome (or `undefined` for a no-op / no
   *  `onUpdate`) so the calling node can report errors via its own `onError`. */
  submit: (args: SubmitArgs) => Promise<UpdateOutcome | undefined>
  setTabDirection: (dir: TabDirection) => void
  recordPreviousEdit: (path: CollectionKey[]) => void
  /** Imperative read for event handlers — does not subscribe. */
  areChildrenBeingEdited: (path: CollectionKey[]) => boolean
}

const initialState: EditingStateBundle = {
  active: null,
  settling: {},
  previouslyEditedElement: null,
  tabDirection: 'next',
}

const createEditingStore = (
  onEditEventRef: React.RefObject<OnEditEventFunction | undefined>,
  buildNodeDataFromPathRef: BuildNodeDataFromPathRef,
  commitRef: React.RefObject<CommitPrimitives | undefined>
): EditingStore => {
  let state = initialState
  const listeners = new Set<() => void>()

  // Cleanup for the *editing*-phase session's local UI buffer, run when that
  // session is displaced (a switch) or cancelled (Esc/✗/external). Held in a
  // closure var (not state) so installing/clearing it never notifies.
  let cancelOp: (() => void) | null = null

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

  // Fire an `onEditEvent` from a prebuilt `NodeData` payload. No-op if there's
  // no consumer. `extra` carries the rename keys / settlement `operation`/`error`.
  const emitEvent = (
    nodeData: NodeData,
    event: EditEvent['event'],
    extra?: Record<string, unknown>
  ) => {
    onEditEventRef.current?.({ ...nodeData, ...extra, event } as EditEvent)
  }

  // Fire an `onEditEvent`, building `NodeData` from the LIVE document at `path`.
  // For pre-apply events (start*/submit*/cancel*) where the node still exists;
  // committed ops use the frozen `BuiltCommit.nodeData` via `emitEvent` instead.
  const fireEditEvent = (
    path: CollectionKey[],
    event: EditEvent['event'],
    extra?: Record<string, unknown>
  ) => {
    if (!onEditEventRef.current) return
    const nodeData = buildNodeDataFromPathRef.current?.(path)
    if (nodeData) emitEvent(nodeData, event, extra)
  }

  const setActive = (active: EditingState | null) => {
    if (sameSession(state.active, active) && state.active?.phase === active?.phase) return
    commit({ ...state, active })
  }

  // ── open: start an inline editing session ────────────────────────────────
  const open = (path: CollectionKey[], options?: OpenOptions) => {
    // Blocked while a held op is mid-gate (one operation at a time).
    if (state.active?.phase === 'held') return

    const op = options?.op ?? 'edit'
    const next: EditingState = { path, op, phase: 'editing', force: options?.force }
    const prev = state.active
    const isSwitch = prev !== null && !sameSession(prev, next)

    // Run the outgoing session's UI cleanup before installing the new one. If
    // that cancelOp itself routed through `cancel()`, it cleared state + fired
    // cancel* already — the post-check below avoids a double-fire.
    const op0 = cancelOp
    cancelOp = null
    if (op0) op0()

    cancelOp = options?.cancelOp ?? null

    // Fire cancel* for the displaced session if its cleanup didn't already tear
    // it down (state.active still pointing at `prev`). A displaced session is
    // always `editing`-phase here (a `held` one blocked us above), so it was
    // never committed — discarding it is correct.
    if (isSwitch && sameSession(state.active, prev)) {
      const cancelEvent = eventForOp(prev.op, 'cancel')
      if (cancelEvent) fireEditEvent(prev.path, cancelEvent)
    }

    setActive(next)
    const startEvent = eventForOp(op, 'start')
    if (startEvent) fireEditEvent(path, startEvent)
  }

  // ── cancel: abort the active session (true user/external cancel) ──────────
  const cancel = () => {
    if (cancelling) return
    // A held op resolves only through its gate (we can't abort the in-flight
    // onUpdate promise), so external cancel is inert against it.
    if (state.active?.phase === 'held') return
    const prev = state.active
    cancelling = true
    try {
      const op0 = cancelOp
      cancelOp = null
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
    const built = prims?.buildCommit(request)
    const extra = built?.extra
    const pathStr = toPathString(path)
    const token = ++nextToken

    if (!instant) {
      const submitEvent = eventForOp(op, 'submit')
      if (submitEvent) fireEditEvent(path, submitEvent)
    }

    // No-op edit (unchanged value): close the session, fire commit*, no onUpdate
    // / settlement / update*. Still runs `onCommit` so a Tab off an untouched
    // field advances to the next node (the value didn't change, but the session
    // did close).
    if (!built || built.isNoOp) {
      if (sameSession(state.active, { path, op, phase: 'editing' })) commit({ ...state, active: null })
      cancelOp = null
      const commitEvent = eventForOp(op, 'commit')
      if (commitEvent) {
        // `built` present (genuine no-op) → fire its frozen snapshot; otherwise
        // the target's gone, so best-effort rebuild from the live path.
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
      // Close the originating session — `sameSession` is phase-agnostic, so this
      // matches both an `editing` submit and the release of a `held` op (same
      // path + op). A Tab/onCommit may reopen the next node after.
      cancelOp = null
      if (sameSession(state.active, { path, op, phase: 'editing' })) commit({ ...state, active: null })
      if (hasUpdate) addSettling(pathStr, token)
      const commitEvent = eventForOp(op, 'commit')
      // Frozen snapshot: the live doc has just mutated (delete/rename destroy the
      // node identity at `path`), so rebuilding from it would describe the wrong
      // node or throw.
      if (commitEvent) emitEvent(nodeData, commitEvent, extra)
      onCommit?.()
    }

    const control: UpdateControl = {
      hold: () => {
        held = true
        // Mark the session held (blocks the tree). Instant ops have no prior
        // session, so create one; editor ops flip their phase to 'held'.
        commit({ ...state, active: { path, op, phase: 'held', force: state.active?.force } })
        return () => apply()
      },
    }

    if (!hasUpdate) {
      // No consumer onUpdate — apply optimistically and we're done (no settle).
      apply()
      return Promise.resolve(undefined)
    }

    const promise = prims!.runUpdate!(input, control)
    if (!held) apply() // default: optimistic close at submit

    return promise.then((outcome) =>
      reconcile(path, op, token, outcome, apply, revert, () => applied, nodeData, extra)
    )
  }

  // ── reconcile: settle the commit's outcome (token-gated) ──────────────────
  // Positional args (not an options object): this is once-called internal
  // plumbing, and object keys can't be minified whereas positional params can.
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

    // Held-without-release: this resolve IS the apply/close moment.
    if (!applied()) {
      if (outcome.status === 'cancel' || outcome.status === 'error') {
        // Gate declined (or rejected) before applying → cancel the session.
        if (state.active?.phase === 'held' && pathsEqual(state.active.path, path)) {
          commit({ ...state, active: null })
        }
        const cancelEvent = eventForOp(op, 'cancel')
        if (cancelEvent) emitEvent(nodeData, cancelEvent)
        if (outcome.status === 'error')
          emitEvent(nodeData, 'updateError', { operation: op, error: outcome.error })
        return outcome
      }
      apply()
    }

    // Token gate: a newer commit for this path superseded us. Ignore silently AND
    // report `undefined` so the originating node treats this stale resolve as a
    // no-op (it must not revert its buffer or show an error — the live commit owns
    // the node now).
    if (state.settling[pathStr] !== token) return undefined
    dropSettling(pathStr)

    // Frozen snapshot for settlement events — a revert has just mutated the live
    // doc (and an add's child path no longer exists), so don't rebuild from it.
    switch (outcome.status) {
      case 'cancel':
        revert() // silent cancel after an optimistic apply
        break
      case 'error':
        revert()
        emitEvent(nodeData, 'updateError', { operation: op, error: outcome.error })
        break
      case 'override':
        // An override replaces the WHOLE document (`onUpdate` returned a modified
        // `newData`), not just the edited node — apply it at the root path.
        commitRef.current?.applyValue([], outcome.value)
        emitEvent(nodeData, 'updateSuccessful', { operation: op, ...extra })
        break
      case 'commit':
        emitEvent(nodeData, 'updateSuccessful', { operation: op, ...extra })
        break
    }
    return outcome
  }

  const setTabDirection = (dir: TabDirection) => {
    if (state.tabDirection !== dir) commit({ ...state, tabDirection: dir })
  }

  const recordPreviousEdit = (path: CollectionKey[]) => {
    const prev = state.previouslyEditedElement
    if (prev === null || !pathsEqual(prev, path)) {
      commit({ ...state, previouslyEditedElement: path })
    }
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
    setTabDirection,
    recordPreviousEdit,
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

  // The store is created once; its identity never changes, so the context value
  // is stable. All three refs are read only at event time, after `Editor` has
  // populated the accessors.
  const storeRef = useRef<EditingStore | null>(null)
  if (storeRef.current === null)
    storeRef.current = createEditingStore(onEditEventRef, buildNodeDataFromPathRef, commitRef)

  return (
    <EditingProviderContext.Provider value={storeRef.current}>
      {children}
    </EditingProviderContext.Provider>
  )
}

/** Returns the (stable) store. Use for actions and imperative reads — no subscription. */
export const useEditingStore = (): EditingStore => {
  const store = useContext(EditingProviderContext)
  if (!store) throw new Error('Missing Editing Context Provider')
  return store
}

// The slice a selector may return: a primitive only. Primitives are
// `Object.is`-stable, so a component re-renders only when the selected value
// actually changes.
type EditingSelection = string | number | boolean | bigint | symbol | null | undefined

/**
 * Subscribe to a derived PRIMITIVE slice of editing state. The `T extends
 * EditingSelection` bound enforces the primitive-only contract at compile time
 * (a selector returning a fresh object/array won't type-check, which would
 * re-render on every emit).
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
 * Whole-bundle compatibility hook: subscribes to every editing change and
 * returns the full state plus the (stable) actions. Do NOT use on the per-node
 * hot path — it wakes on every edit transition; use `useEditingSelector` there.
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
      setTabDirection: store.setTabDirection,
      recordPreviousEdit: store.recordPreviousEdit,
      areChildrenBeingEdited: store.areChildrenBeingEdited,
    }),
    [bundle, store]
  )
}
