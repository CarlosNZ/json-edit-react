import { type ExampleDef } from './types'
import { blurbs } from '../demoData/blurbs'

// One entry per targeted example. Adding a new example is one entry here plus
// one file — the shell handles routing, theming, source display, and (for live)
// the editable playground. Keys are the URL slug: `/examples/<slug>`.
//
// Examples that mirror a main-demo data set share that data set's blurb via the
// `blurbs` map (single source of truth — see demoData/blurbs.ts), so the
// example-page text and the demo description never drift.
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
      'Display the full `onEditEvent` lifecycle as toast notifications — pass in your own notifier and fire it on every event, colour-coded by category: in-progress (blue), applied / save confirmed (green), discarded or removed (orange), save rejected (red). Toggle **Use delayed settlement** to switch the `onUpdate` save between immediate (edits commit straight away, so the stream ends at `commitEdit`) and asynchronous (saves settle after a random delay and fail one in four, adding `updateSuccess` / `updateError` to the tail). Edit, rename, add, move or delete a node and watch it stream.',
    load: () => import('./static/event-signals/Example'),
    code: () => import('./static/event-signals/Example.tsx?raw'),
  },
  'collapse-signals': {
    kind: 'static',
    title: 'Collapse signals',
    blurb:
      "Dis every `onCollapse` event as a toast — each shows the node's `path`, whether it was collapsed or expanded, and whether the action reached all descendants. Click a node's collapse arrow to fold just that node, then hold the modifier key (`Alt` / `Option`) while clicking to fold its whole subtree and watch `includeChildren` flip to `true`. The data is deliberately deep so the descendant collapse is easy to see.",
    load: () => import('./static/collapse-signals/Example'),
    code: () => import('./static/collapse-signals/Example.tsx?raw'),
  },
  'imperative-control': {
    kind: 'static',
    selfChrome: true,
    title: 'Imperative control',
    blurb:
      'Drive the editor from your own UI through the `editorRef` handle. Enter a node `path`, then **Start Edit** to open a value-edit session there — its return value (`true`, `RESTRICTED`, or `PATH_NOT_FOUND`) shows as a toast — and **Confirm** or **Cancel** it.\n\nThe tree carries the same lock-down as the Edit restrictions example, so editing `id` or `settings` is refused unless you tick **Bypass edit restrictions** (which skips only the `allowEdit` filter — `onUpdate` still runs at confirm). You can also **Collapse** / **Expand** the path, optionally with **Include children** to fold the whole subtree.\n\n***Tip**: rather than typing a path, hold **Cmd / Ctrl** and click the clipboard icon on any node to copy its path, then paste it in.*',
    load: () => import('./static/imperative-control/Example'),
    code: () => import('./static/imperative-control/Example.tsx?raw'),
  },
  'heat-map': {
    kind: 'static',
    title: 'Heat map',
    blurb:
      'Drive styling from the data itself with Style Functions — give a theme element a function of the node instead of a fixed value. Here, a `number` function paints every temperature on a cold-blue → hot-red gradient by its value, while a `property` function tints each country by the average of its cities. Both merge over whichever base theme you pick, so switch the theme above and the heat map stays lit — then edit a temperature and watch its colour shift live.',
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
  'new-key-restrictions': {
    kind: 'static',
    title: 'New keys & defaults',
    blurb:
      'Shape how new keys are added with `newKeyOptions` and `defaultValue`. Adding to `contact` offers a fixed dropdown of fields, each seeded with its own default value; adding to the open-ended `tags` object falls back to a free-text key and a `null` value.',
    load: () => import('./static/new-key-restrictions/Example'),
    code: () => import('./static/new-key-restrictions/Example.tsx?raw'),
  },
  'on-update': {
    kind: 'static',
    title: 'onUpdate basics',
    blurb:
      'Basic `onUpdate` usage: branch on the `event` (edit / add / delete / rename / move) and return a value to drive each outcome. Editing `username` transforms it (`{ value }`), a bad `email` rejects with a custom message (`{ error }`), a negative `age` reverts with the default error (`false`), and deleting `id` silently cancels (`null`).',
    load: () => import('./static/on-update/Example'),
    code: () => import('./static/on-update/Example.tsx?raw'),
  },
  'on-change': {
    kind: 'static',
    title: 'onChange validation',
    blurb:
      "Constrain or transform input live with `onChange`, which runs on every keystroke (before commit) and returns the value to put back in the field. Editing `name` strips anything that isn't a letter or space, `age` is clamped to 0–100 as you type, and `couponCode` is forced to upper case.",
    load: () => import('./static/on-change/Example'),
    code: () => import('./static/on-change/Example.tsx?raw'),
  },
  'confirm-and-settle': {
    kind: 'static',
    title: 'Confirm & settle',
    blurb:
      'Three gating patterns in one editor. `Server-side validation` commits optimistically then settles after a random 0.5–3s — accepting with a toast, or rejecting a value that doesn\'t contain a "Z". `Local confirmation` gates edits behind a modal via `useConfirmOnUpdate` (which drives core\'s `hold()`). Deleting `Careful` combines both: a confirmation modal, then a random 0.5–3s settle from a flaky server that fails half the time.',
    load: () => import('./static/confirm-and-settle/Example'),
    code: () => import('./static/confirm-and-settle/Example.tsx?raw'),
  },
  'json-schema-validation': {
    kind: 'static',
    title: 'JSON Schema validation',
    demoDataSet: 'jsonSchemaValidation',
    blurb: blurbs.jsonSchemaValidation,
    load: () => import('./static/json-schema-validation/Example'),
    code: () => import('./static/json-schema-validation/Example.tsx?raw'),
  },
  intro: {
    kind: 'static',
    title: 'Intro',
    demoDataSet: 'intro',
    blurb: blurbs.intro,
    load: () => import('./static/intro/Example'),
    code: () => import('./static/intro/Example.tsx?raw'),
  },
  'star-wars': {
    kind: 'static',
    title: 'Star Wars',
    demoDataSet: 'starWars',
    blurb: blurbs.starWars,
    load: () => import('./static/star-wars/Example'),
    code: () => import('./static/star-wars/Example.tsx?raw'),
  },
  'json-placeholder': {
    kind: 'static',
    title: 'Client list',
    demoDataSet: 'jsonPlaceholder',
    blurb: blurbs.jsonPlaceholder,
    load: () => import('./static/json-placeholder/Example'),
    code: () => import('./static/json-placeholder/Example.tsx?raw'),
  },
  'custom-nodes': {
    kind: 'static',
    title: 'Custom nodes',
    demoDataSet: 'customNodes',
    blurb: blurbs.customNodes,
    load: () => import('./static/custom-nodes/Example'),
    code: () => import('./static/custom-nodes/Example.tsx?raw'),
  },
  'custom-keys': {
    kind: 'static',
    title: 'Custom node keys',
    blurb:
      'This dossier demonstrates the `keyComponent` property of Custom Nodes — a definition can render its own component in place of the property label, for both value *and* collection nodes.\n\n' +
      'Five inline definitions are at work here:\n\n' +
      '- Keys starting with `_` are *classified* (italic + 🔒). Try expanding `_emergencyContact` — this works on collection keys, not just leaf values.\n' +
      '- Keys starting with `REDACTED_` are blacked out — the original key is preserved in the data and shown on hover.\n' +
      '- Codename keys (`M`, `Q`, `dob`, `bp`) get an inline expansion via a shared `componentProps` map.\n' +
      '- Keys ending in `!` get a ⚠️ priority badge.\n' +
      '- URLs under `Field Reports` use `keyComponent` *and* `component` in one definition — 🔗 in the key, clickable anchor in the value.\n\n' +
      'Double-click any customised key to enter the standard key-edit input. Try renaming `REDACTED_passportId` to drop the prefix and watch the redaction lift.',
    load: () => import('./static/custom-keys/Example'),
    code: () => import('./static/custom-keys/Example.tsx?raw'),
  },
  'custom-component-library': {
    kind: 'static',
    title: 'Custom component library',
    demoDataSet: 'customComponentLibrary',
    blurb: blurbs.customComponentLibrary,
    load: () => import('./static/custom-component-library/Example'),
    code: () => import('./static/custom-component-library/Example.tsx?raw'),
  },
  'date-picker': {
    kind: 'static',
    title: 'Date picker',
    blurb:
      'The pre-built `DatePicker` from `@json-edit-react/components` swaps a calendar widget in for ISO date/time strings — its built-in `condition` is the guard, so the plain-string `name` is left untouched. The same component is registered three times, each scoped to one field and handed different `componentProps`:\n\n' +
      '- **Date only** — `startDate` sets `showTime: false`, dropping the time fields.\n' +
      '- **Date + time** — `checkIn` keeps the defaults.\n' +
      '- **Custom display** — `rsvpBy` passes a `formatter` to control its read-only text.\n\n' +
      'Since `componentProps` is set per-definition, separate definitions are how you send different props to different nodes. The picker UI is the swappable `ReactDatePicker` widget, passed via `componentProps.DatePicker`.',
    load: () => import('./static/date-picker/Example'),
    code: () => import('./static/date-picker/Example.tsx?raw'),
  },
  'display-vs-edit': {
    kind: 'static',
    title: 'Display vs. edit modes',
    blurb:
      'Four custom components on one product card, each landing at a different point on the view/edit spectrum — set by three flags (`showOnView`, `showOnEdit`, `showEditTools`):\n\n' +
      '- **`brightness`** — a meter bar. The *default* custom node: shown in view, but editing falls back to the standard number input.\n' +
      '- **`warmth`** — a Kelvin slider. *Edit-only* (`showOnView: false`): the raw number shows in view, the slider appears only on edit.\n' +
      '- **`rating`** — click-to-set stars. *One interface* — it commits on click and never opens an edit session, so `showEditTools` is off and `showOnEdit` goes unused (the pre-built `BooleanToggle` works the same way).\n' +
      '- **`accent`** — the pre-built `ColorPicker`, custom in *both* modes (a swatch in view, a wheel on edit); edit tools off, so a double-click on the swatch starts editing.\n\n' +
      'The meter, slider and stars are written from scratch; the colour picker is the pre-built `ColorPicker` from `@json-edit-react/components`.',
    load: () => import('./static/display-vs-edit/Example'),
    code: () => import('./static/display-vs-edit/Example.tsx?raw'),
  },
  bigint: {
    kind: 'static',
    title: 'BigInt',
    blurb:
      "A from-scratch `BigInt` node — for values JSON and plain JS numbers can't hold (the IDs here are past `Number.MAX_SAFE_INTEGER`). It wires the complete non-plain-value lifecycle as two mirrored pairs of hooks:\n\n" +
      '- **Inline editing** — `toStandardType` demotes the BigInt to a digit string for the edit buffer, and `fromStandardType` converts it back on confirm (and *throws* on a non-integer, rejecting the edit).\n' +
      '- **Edit as JSON** — `stringifyReplacer` / `parseReviver` round-trip the BigInt through a tagged `{ __type, value }` object, because JSON has no BigInt and `JSON.stringify` throws on a raw one.\n\n' +
      'Type selection is on, so the menu also shows `fromStandardType`\'s *seed* path: switch a digit string to BigInt and the digits carry over; switch the name and the conversion throws, falling back to `defaultValue` (Esc restores it). Try "Edit as JSON" on the root to watch the round-trip — then flip **Enable processing** off to drop all four hooks at once and see editing fall back to plain strings.',
    load: () => import('./static/bigint/Example'),
    code: () => import('./static/bigint/Example.tsx?raw'),
  },
  'creating-types': {
    kind: 'static',
    title: 'Creating custom types',
    blurb:
      'Turn a node *into* a custom type from the Type selector (`showInTypeSelector` + a `defaultValue`), and use `editOnTypeSwitch` to decide what happens next. Custom node types, an enum, and the standard types all share one selector — edit any value, click the type icon, and pick:\n\n' +
      '- **Colour** — `editOnTypeSwitch: true`, so picking it *opens the editor* seeded with its Hot Pink default. For types you always want to set right away.\n' +
      '- **Location** — a `"(lat, lng)"` string shown as a 📍 map link, with `editOnTypeSwitch: false`: picking it just *drops the default landmark* (Mount Everest) and closes — no editing step.\n' +
      '- **Continent** — a plain `EnumDefinition`, offered right alongside the custom types via `allowTypeSelection`.\n\n' +
      "Each custom type's `defaultValue` satisfies its `condition`, so the new node renders as that type immediately.",
    load: () => import('./static/creating-types/Example'),
    code: () => import('./static/creating-types/Example.tsx?raw'),
  },
  'decorating-nodes': {
    kind: 'static',
    title: 'Decorating nodes',
    blurb:
      'A custom component usually *replaces* a node, but it can also wrap the original. With `passOriginalNode`, the component is handed the node exactly as the library would have rendered it (`originalNode`) to embed within its own output — the default node, plus your decoration (a badge, a marker, a highlight). The pre-built `ErrorIndicator` from `@json-edit-react/components` does just this: it renders the node untouched and appends a ⚠️.\n\n' +
      'These team scores should all be numbers, but about a third arrive as strings (`"50"` instead of `50`). A `condition` flags those string values, so each invalid score gets a warning marker. Switch one to the `number` type from the type selector (while editing) and the marker clears — its value carries straight over.\n\n' +
      'Scores are randomly generated on every load: a normal distribution centred on 65 (± 15), clamped to 1–100.',
    load: () => import('./static/decorating-nodes/Example'),
    code: () => import('./static/decorating-nodes/Example.tsx?raw'),
  },
  'custom-collection-nodes': {
    kind: 'static',
    title: 'Custom collection nodes',
    blurb:
      'Custom *collection* nodes (objects and arrays) get two slots a value node lacks, plus flags to drop the default chrome — together they turn raw JSON into real UI. `component` owns the **contents** (rendered between the brackets, with the child rows handed to you as `children`); `wrapperComponent` wraps the **whole node** (it arrives as `children`).\n\n' +
      'This profile uses them at three levels of takeover:\n\n' +
      '- **note** — `wrapperComponent` only. The node renders exactly as normal (chevron, brackets, rows) inside a callout frame; the contents are untouched.\n' +
      '- **skills** — `component` only, with `showCollectionWrapper: false` to drop the brackets. The default rows still arrive as `children`; they are just re-wrapped in a panel.\n' +
      '- **profile** — *both* slots, with the brackets and key turned off too, so no default chrome remains. The `component` ignores `children` and builds its own avatar and field list straight from the data, while the `wrapperComponent` supplies the card and its title.\n\n' +
      'So `component` is always handed the rows as `children`, but it can ignore them and render from `nodeData` instead — as the profile does.',
    load: () => import('./static/custom-collection-nodes/Example'),
    code: () => import('./static/custom-collection-nodes/Example.tsx?raw'),
  },
  playlist: {
    kind: 'static',
    title: 'Playlist',
    blurb:
      'A custom **collection** node that owns its editor (`showOnEdit: true`) keeps the live child rows as its `children` *while editing*, just as in view — so it can place an editable header or toolbar **above** the rows and keep them interactive the whole time, instead of being handed the built-in JSON textarea.\n\n' +
      "Here `tracks` is the custom node: its header shows the track count and total runtime, and **Reorder…** opens the node's own edit session, swapping the header for a Shuffle / Sort / Reverse toolbar — each commits a reordered array through `setValue`, no special editor prop required.\n\n" +
      'Try it while the toolbar is open: the track rows stay fully editable. Change a title or `seconds` inline and, because there is a single active edit session, doing so simply displaces the header’s session.\n\n' +
      'Editing is fenced with the filter-function toolkit (`@json-edit-react/utils/filters`): `byPath(\'tracks.*\')` allows only whole tracks to be **deleted** and **dragged** — never their fields, the playlist title, or the list itself — and type changes are off everywhere. Adding is disabled (`allowAdd: false`), so the header’s **Add track** button — a `setValue` edit — is the only way to add one.\n\n' +
      'That `allowAdd: false` also confines the drag-and-drop: moving a track into a *different* collection is a relocate, which needs add-permission at the destination — so tracks reorder within the list but can’t be dragged out onto the title or into another track.',
    load: () => import('./static/playlist/Example'),
    code: () => import('./static/playlist/Example.tsx?raw'),
  },
  'drag-drop-rules': {
    kind: 'static',
    title: 'Drag & drop rules',
    blurb:
      'Drag-and-drop obeys the same per-node permissions as the rest of the editor — this page gathers all of them in one place to play with. Moving an item **within its own list** (a *reorder*) and moving it **to another list** (a *relocate*) are allowed separately, so a list can be one you’re free to shuffle but can’t add to, or one you can drop into but can’t rearrange.\n\n' +
      'Every list holds the same three items: **🟢 free** can be reordered *and* moved to another list; **🟡 no-exit** can be reordered in place but never leaves its list; **🔴 pinned** can’t be picked up at all.\n\n' +
      'The four lists differ in what they allow: **open** — reorder ✓, accepts drops ✓; **reorderOnly** — reorder ✓, accepts drops ✗; **dropZone** — reorder ✗, accepts drops ✓; **locked** — neither.\n\n' +
      'To move an item *into* a list, drop it onto an item already in that list. Try dragging a **🟢 free** from *open* into *dropZone* (works) or into *reorderOnly* (refused — it won’t take drops); reorder inside *open* (works) vs inside *locked* (refused); or grab a **🟡 no-exit** and try to drag it out of its list (refused). A row only highlights when the drop is actually allowed.',
    load: () => import('./static/drag-drop-rules/Example'),
    code: () => import('./static/drag-drop-rules/Example.tsx?raw'),
  },
  'student-cards': {
    kind: 'static',
    title: 'Student ID cards',
    blurb:
      'A class roster where each entry in the `students` array is rendered as a designed ID card. A single `wrapperComponent` matches those objects by path, turns off the default brackets and key (`showCollectionWrapper: false`, `showKey: false`), and lays out the photo, name, dates and membership badge straight from the data.\n\n' +
      'The card supplies its own colours and fonts, so it stays a polished, consistent object on every theme — while the surrounding `school` / `classroom` / `teacher` fields render with the normal editor. Flip the "Render students as ID Cards" toggle (a pre-built `BooleanToggle`) off to drop the definition and reveal the raw student objects.',
    load: () => import('./static/student-cards/Example'),
    code: () => import('./static/student-cards/Example.tsx?raw'),
  },
  'collection-as-value': {
    kind: 'static',
    title: 'Collection as a value',
    blurb:
      '`renderCollectionAsValue` treats a whole object as a single value rather than expanding it into key/value rows — the matched object is handed to your `component` as `value`, which renders (and edits) it as one field. This landmark record uses three: a from-scratch `Location` for `{ lat, lng }` (a map link in view, two number inputs while editing), plus the pre-built `DateObject` (a real `Date`) and `EnhancedLink` (a `{ text, url }`) from `@json-edit-react/components`. The plain `name` and `architect` fields render as normal rows.',
    load: () => import('./static/collection-as-value/Example'),
    code: () => import('./static/collection-as-value/Example.tsx?raw'),
  },
  'custom-error-ui': {
    kind: 'static',
    title: 'Custom error UI',
    blurb:
      'Replace the built-in inline error messages with your own UI. `showErrorMessages` is off and every change is rejected by `onUpdate`, so `onError` fires for each failure and raises a toast detailing the error `code`, the `path`, and a message. Edit, add or delete any field to see its code, or rename a key onto an existing sibling (e.g. `port` → `host`) for a `KEY_EXISTS` error. And try inserting invalid JSON in the raw editor for an `INVALID_JSON` error.',
    load: () => import('./static/custom-error-ui/Example'),
    code: () => import('./static/custom-error-ui/Example.tsx?raw'),
  },
  'custom-buttons': {
    kind: 'static',
    title: 'Custom buttons',
    blurb:
      'Add your own action buttons alongside the built-in Copy / Edit / Delete. Each button\'s `Element` receives the node\'s `nodeData` and can render conditionally, while `onClick` runs any handler — here, an "open link" button on URLs and a "duplicate" button on array items.',
    load: () => import('./static/custom-buttons/Example'),
    code: () => import('./static/custom-buttons/Example.tsx?raw'),
  },
  'massive-data': {
    kind: 'static',
    title: 'Massive data set',
    blurb:
      "A ~19,000-node document. It opens only two levels deep (`collapse={2}`), and a collapsed branch isn't rendered until you first expand it, so the initial render only pays for what's visible. Editing a value re-renders just that node, not the whole tree. Expand a branch, edit a leaf, or search to explore.",
    load: () => import('./static/massive-data/Example'),
    code: () => import('./static/massive-data/Example.tsx?raw'),
  },
  'swap-the-built-ins': {
    kind: 'static',
    title: 'Swap the built-ins',
    blurb:
      'Replace the native dropdown and raw-JSON textarea with the `ReactSelect` (`react-select` wrapper) and `CodeEditor` (CodeMirror) components from `@json-edit-react/components`. Try the type selector, add a new key on the `task` object, edit the enum-typed `status` / `priority` values, or open "Edit as JSON" on any collection.',
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
  'theme-overrides': {
    kind: 'static',
    title: 'Theme overrides',
    blurb:
      'Layer your own styling over any base theme. The `theme` prop takes an array — the base theme, then override layers that merge on top (later wins, with style functions applied last). Here fixed edit/delete icon colours, bold-italic booleans, green/red boolean tints, and hex-string colour swatches all stay pinned as you switch the base theme above.',
    load: () => import('./static/theme-overrides/Example'),
    code: () => import('./static/theme-overrides/Example.tsx?raw'),
  },
  localisation: {
    kind: 'static',
    title: 'Localisation',
    blurb:
      "Switch the editor's entire UI language from inside the data: the first field is a `Language` enum (English / Japanese / French), and changing it swaps the `translations` prop so every label, tooltip, count and error re-renders in the chosen language. Only the chrome translates — your data stays put.\n\n" +
      'The rest is tuned to surface as many UI strings as possible:\n\n' +
      "- **Tooltips & counts** — `showIconTooltips` shows the tooltip strings on hover; `showCollectionCount` keeps item counts visible, and a search switches them to the filtered 'n of m' form.\n" +
      '- **Errors** — only `settings` (editable values, plus new keys) and the language switch are accepted, so editing, deleting, renaming or moving anything else surfaces the localised error messages — as do renaming onto an existing key and invalid raw JSON.\n' +
      "- **Adding keys** — see the free-text key prompt, the `settings` dropdown, and the 'no options' message once a collection's keys run out.\n" +
      '- **Odds & ends** — convert a `settings` value to an object to seed a default-named child; an empty property key and a truncated string cover the rest.',
    load: () => import('./static/localisation/Example'),
    code: () => import('./static/localisation/Example.tsx?raw'),
  },
  'custom-text': {
    kind: 'static',
    title: 'Custom text',
    blurb:
      "`customText` overrides the editor's localisable strings with functions of the node, so the displayed text adapts to each node's content, depth and size. This music library shows three techniques at once:\n\n" +
      "- **Aggregate counts** — an album's item count becomes `9 tracks · 47 min` (summed from the data); a genre's becomes `2 albums · 16 min`.\n" +
      '- **Empty states** — an empty album or genre reads `No tracks yet` / `No albums yet` instead of `0 items`.\n' +
      '- **Context-aware prompts** — the add-a-key placeholder is `Name a new genre…` at the root and `New album title…` inside a genre.\n\n' +
      "Edit a track's length, or add and remove whole songs, and every summary recomputes live. Light edit rules keep each song's `title` / `seconds` intact, and tracks are numbered from 1.",
    load: () => import('./static/custom-text/Example'),
    code: () => import('./static/custom-text/Example.tsx?raw'),
  },
  'validation-flagging': {
    kind: 'static',
    title: 'Validation flagging (dev)',
    blurb:
      'Reactive validation with `useValidationState` (`@json-edit-react/utils`) plus the `ErrorIndicator` glyph component (`@json-edit-react/components`). An AJV schema links `payment.method` to `card.number` (`minLength: 16` only while method is `card`), so editing `method` flips the validity of a node on another branch. `errorIndicatorDefinition` adds a ⚠️ to invalid nodes via its `condition`, memoized on the validation state — so the marker appears/clears cross-branch the instant validity changes. The fix for the sibling “Validation staleness” gotcha.',
    load: () => import('./static/validation-flagging/Example'),
    code: () => import('./static/validation-flagging/Example.tsx?raw'),
    devOnly: true,
  },
  'validation-staleness': {
    kind: 'static',
    title: 'Validation staleness (dev)',
    blurb:
      'Scratchpad: why validating inside a style function breaks under fine-grained re-rendering. The schema links `payment.method` to `card.number` (`minLength: 16` applies only while method is `card`), so editing `method` changes the validity of a node on another branch — which never re-renders. The banner above the editor recomputes every commit and tells the truth; the node styling lags. Collapse/re-expand `card` to force a re-render and watch it correct itself.',
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

// Reverse lookup: a main-demo data-set key → the slug of the example page that
// mirrors it, derived from each entry's `demoDataSet` so the registry stays the
// single source of truth. The demo's "View source code" badge uses this to link
// a data set to its example page.
export const exampleSlugByDataSet: Record<string, string> = Object.fromEntries(
  Object.entries(examples)
    .filter(([, def]) => def.demoDataSet)
    .map(([slug, def]) => [def.demoDataSet as string, slug])
)
