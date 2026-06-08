import { type ExampleDef } from './types'

// One entry per targeted example. Adding a new example is one entry here plus one
// file — the shell handles routing, theming, source display, and (for live) the
// editable playground. Keys are the URL slug: `/examples/<slug>`.
export const examples: Record<string, ExampleDef> = {
  'delayed-settlement': {
    kind: 'static',
    title: 'Delayed settlement',
    blurb:
      'An async `onUpdate` that simulates a server round-trip. The edit is applied optimistically, then settles once the promise resolves.',
    load: () => import('./static/delayed-settlement/Example'),
    code: () => import('./static/delayed-settlement/Example.tsx?raw'),
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
}
