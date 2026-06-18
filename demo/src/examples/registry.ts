import { type ExampleDef } from './types'

// One entry per targeted example. Adding a new example is one entry here plus
// one file — the shell handles routing, theming, source display, and (for live)
// the editable playground. Keys are the URL slug: `/examples/<slug>`.
const allExamples: Record<string, ExampleDef> = {
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
  'filter-toolkit': {
    kind: 'custom',
    title: 'Filter toolkit',
    blurb:
      "Compose the `allow*` props and `searchFilter` from `@json-edit-react/utils`' predicate builders. Pick a builder to highlight every node it matches (a predicate is `(node) => boolean`, a theme style function is `(node) => CSSProperties` — the same function drives both), optionally bind it to `allowEdit`, and try the `matchesSearch` / `matchRecord` search bridges against a deep org-chart document.",
    load: () => import('./filter-toolkit/Example'),
  },
  'event-signals': {
    kind: 'static',
    title: 'Event signals',
    blurb:
      "Surface the full `onEditEvent` lifecycle as toast notifications — pass in your own notifier and fire it on every event, colour-coded by category: in-progress (blue), applied / save confirmed (green), discarded or removed (orange), save rejected (red). Saves settle after a random delay and fail one in four, so the stream mixes `updateSuccess` and `updateError`. Edit, rename, add, move or delete a node and watch it stream.",
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
  'json-viewer': {
    kind: 'static',
    title: 'Read-only viewer',
    blurb:
      'Browse a rich, deeply-nested document with `JsonViewer` — the read-only sibling of `JsonEditor`. Every edit / add / delete / drag affordance is stripped, but you can still collapse and expand any branch and copy a value or its path. Switch the theme above, or expand into the planets.',
    load: () => import('./static/json-viewer/Example'),
    code: () => import('./static/json-viewer/Example.tsx?raw'),
  },
  'edit-restrictions': {
    kind: 'static',
    title: 'Edit restrictions',
    blurb:
      'Drive `allowEdit` / `allowDelete` / `allowAdd` with filter functions: the root and `id` are read-only, only leaf values can be deleted, only the `roles` array accepts new items, and the `settings` keys are locked while their values stay editable — a key-rename restriction, since renaming a property needs both `allowEdit` and `allowDelete`.',
    load: () => import('./static/edit-restrictions/Example'),
    code: () => import('./static/edit-restrictions/Example.tsx?raw'),
  },
  'type-restrictions': {
    kind: 'static',
    title: 'Type restrictions',
    blurb:
      'Constrain which data types each node can become with an `allowTypeSelection` filter function — including an Enum and a custom node type. `status` is locked to a Status enum, `done` stays boolean, numbers offer scalars only (never null or collections), and any string can switch to a custom "Colour" swatch node.',
    load: () => import('./static/type-restrictions/Example'),
    code: () => import('./static/type-restrictions/Example.tsx?raw'),
  },
  enums: {
    kind: 'static',
    title: 'Enums',
    blurb:
      'Restrict values to a fixed list with Enum types. A calendar event where `priority` is locked to a Priority enum (the only type it can be), while `day` and `colour` offer their enum alongside the standard types via the `standardDataTypes` spread. `matchPriority` makes existing strings load as their enum type.',
    load: () => import('./static/enums/Example'),
    code: () => import('./static/enums/Example.tsx?raw'),
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
  'custom-icons': {
    kind: 'static',
    title: 'Custom icons',
    blurb:
      "Replace the built-in Edit / Copy / Delete glyphs via `theme.icons`, each authored a different way: a hand-written `IconDefinition`, a React `<svg>` through `iconFromSvg`, and a plain SVG string through `iconFromSvg`. Hover a row to reveal them, then switch the theme — the glyphs recolour via `currentColor`, except the Copy icon's fixed amber back page, showing a glyph can carry some of its own colour and still be themeable.",
    load: () => import('./static/custom-icons/Example'),
    code: () => import('./static/custom-icons/Example.tsx?raw'),
  },
  'validation-flagging': {
    kind: 'static',
    title: 'Validation flagging (dev)',
    blurb:
      "Reactive validation with `useValidationState` (`@json-edit-react/utils`) plus the `ErrorIndicator` glyph component (`@json-edit-react/components`). An AJV schema links `payment.method` to `card.number` (`minLength: 16` only while method is `card`), so editing `method` flips the validity of a node on another branch. `errorIndicatorDefinition` adds a ⚠️ to invalid nodes via its `condition`, memoized on the validation state — so the marker appears/clears cross-branch the instant validity changes. The fix for the sibling “Validation staleness” gotcha.",
    load: () => import('./static/validation-flagging/Example'),
    code: () => import('./static/validation-flagging/Example.tsx?raw'),
    devOnly: true,
  },
  'validation-staleness': {
    kind: 'static',
    title: 'Validation staleness (dev)',
    blurb:
      "Scratchpad: why validating inside a style function breaks under fine-grained re-rendering. The schema links `payment.method` to `card.number` (`minLength: 16` applies only while method is `card`), so editing `method` changes the validity of a node on another branch — which never re-renders. The banner above the editor recomputes every commit and tells the truth; the node styling lags. Collapse/re-expand `card` to force a re-render and watch it correct itself.",
    load: () => import('./static/validation-staleness/Example'),
    code: () => import('./static/validation-staleness/Example.tsx?raw'),
    devOnly: true,
  },
}

// `devOnly` entries are private scratchpads: present on the dev server,
// stripped from production builds so they neither list in the index nor
// resolve as routes on the deployed demo.
export const examples: Record<string, ExampleDef> = import.meta.env.DEV
  ? allExamples
  : Object.fromEntries(Object.entries(allExamples).filter(([, def]) => !def.devOnly))
