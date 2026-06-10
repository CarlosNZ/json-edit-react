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
  'event-signals': {
    kind: 'static',
    title: 'Event signals',
    blurb:
      "Surface the full `onEditEvent` lifecycle as toast notifications — pass in your own notifier and fire it on every event, colour-coded by category: in-progress (blue), applied / save confirmed (green), discarded or removed (orange), save rejected (red). Saves settle after a random delay and fail one in four, so the stream mixes `updateSuccessful` and `updateError`. Edit, rename, add, move or delete a node and watch it stream.",
    load: () => import('./static/event-signals/Example'),
    code: () => import('./static/event-signals/Example.tsx?raw'),
  },
  'heat-map': {
    kind: 'static',
    title: 'Heat map',
    blurb: 'A static example showing a heat map of temperatures across different cities.',
    load: () => import('./static/heat-map/Example'),
    code: () => import('./static/heat-map/Example.tsx?raw'),
  },
  'custom-buttons': {
    kind: 'static',
    title: 'Custom buttons',
    blurb:
      "Add your own action buttons alongside the built-in Copy / Edit / Delete. Each button's `Element` receives the node's `nodeData` and can render conditionally, while `onClick` runs any handler — here, an \"open link\" button on URLs and a \"duplicate\" button on array items.",
    load: () => import('./static/custom-buttons/Example'),
    code: () => import('./static/custom-buttons/Example.tsx?raw'),
  },
  'massive-data': {
    kind: 'static',
    title: 'Massive data set',
    blurb:
      "A ~19,000-node document (~900 KB) that's lazy-loaded with a dynamic `import()`, so it sits in its own chunk and never weighs down the initial bundle. It opens collapsed past the top level to keep the first render fast — expand into any branch to explore.",
    load: () => import('./static/massive-data/Example'),
    code: () => import('./static/massive-data/Example.tsx?raw'),
  },
  'swap-the-built-ins': {
    kind: 'static',
    title: 'Swap the built-ins',
    blurb:
      "Replace JsonEditor's native dropdown and raw-JSON textarea with the `ReactSelect` (`react-select` wrapper) and `CodeEditor` (CodeMirror) components from `@json-edit-react/components`. Try the type selector, add a new key on the `task` object, edit the enum-typed `status` / `priority` values, or open \"Edit as JSON\" on any collection.",
    load: () => import('./static/swap-the-built-ins/Example'),
    code: () => import('./static/swap-the-built-ins/Example.tsx?raw'),
  },
}
