import { toPathString, type CustomNodeDefinition } from 'json-edit-react'
import type { JsonEditorEventName } from './events'

/**
 * Identifies the node whose update is currently in flight (awaiting confirmation
 * or a slow async `onUpdate`). `path` is a `toPathString` key for stable
 * comparison; `event` lets a pending-node component branch its display. Shared
 * by the confirm hooks and any other utility that overlays an in-flight node.
 */
export interface PendingUpdate {
  path: string
  event: JsonEditorEventName
}

/**
 * Builds a `CustomNodeDefinition` that renders `component` on the node identified
 * by `pending`. A factory (not a static const) because the `condition` closes
 * over `pending` — and, just as importantly, the returned object's identity
 * changes with `pending`, which is what makes the editor's memo comparator
 * re-render the affected node (it compares `customNodeDefinitions` by reference).
 *
 * Takes the component as a parameter — this package ships no pending UI, and it
 * keeps the module free of any component import so it never bloats consumers who
 * don't use the overlay.
 */
export const createPendingCommitDefinition = (
  pending: PendingUpdate | null,
  component: NonNullable<CustomNodeDefinition['component']>
): CustomNodeDefinition => ({
  condition: ({ path }) => pending !== null && toPathString(path) === pending.path,
  component,
  componentProps: { event: pending?.event },
  // The node is in VIEW mode during the pending window (core's `closeEdit` fires
  // before the awaited commit), so render on view; lock its edit tools.
  showOnView: true,
  showEditTools: false,
  passOriginalNode: true,
})
