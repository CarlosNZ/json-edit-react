import { type ExampleDef } from './types'

// One entry per targeted example. Adding a new example is one entry here plus
// one file — the shell handles routing, theming, source display, and (for live)
// the editable playground. Keys are the URL slug: `/examples/<slug>`.
export const examples: Record<string, ExampleDef> = {
  'delayed-settlement': {
    kind: 'static',
    title: 'Delayed settlement',
    blurb:
      'An async `onUpdate` that simulates a server round-trip. The edit is applied optimistically, then settles once the promise resolves.',
    load: () => import('./static/delayed-settlement/Example'),
    code: () => import('./static/delayed-settlement/Example.tsx?raw'),
  },
  'pending-overlay': {
    kind: 'static',
    title: 'Pending overlay',
    blurb:
      'A custom node that shows a "saving…" badge while a node\'s optimistic edit settles. The `isPending` prop is true for exactly the window the async `onUpdate` is in flight.',
    load: () => import('./static/pending-overlay/Example'),
    code: () => import('./static/pending-overlay/Example.tsx?raw'),
  },
  'confirm-edits': {
    kind: 'static',
    title: 'Confirm before commit',
    blurb:
      "Gate every change on a confirmation modal with `useConfirmOnUpdate` (from `@json-edit-react/utils`). The hook drives core's `hold()` gate — the editor stays open and the tree is blocked while the modal is up — then commits on confirm or reverts on cancel. The modal is your own component.",
    load: () => import('./static/confirm-edits/Example'),
    code: () => import('./static/confirm-edits/Example.tsx?raw'),
  },
  'collapse-playground': {
    kind: 'live',
    title: 'Collapse playground',
    blurb:
      'Edit the code on the right — tweak `collapse`, the data, or any prop — and watch the editor update live.',
    code: () => import('./live/collapse-playground/code'),
  },
  'editing-model': {
    kind: 'custom',
    title: 'Editing model & events',
    blurb:
      'Exercise the optimistic commit lifecycle, the hold() gate and the full onEditEvent stream. Pick an onUpdate behaviour, then edit / rename / add / delete and watch the event viewer.',
    load: () => import('./editing-model/Example'),
  },
  'heat-map': {
    kind: 'static',
    title: 'Heat map',
    blurb: 'A static example showing a heat map of temperatures across different cities.',
    load: () => import('./static/heat-map/Example'),
    code: () => import('./static/heat-map/Example.tsx?raw'),
  },
}
