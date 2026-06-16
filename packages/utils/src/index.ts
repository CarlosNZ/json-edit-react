// @json-edit-react/utils — public entry point.
//
// Utility hooks and helpers that are useful alongside json-edit-react but
// don't belong in the zero-dependency core. Keep this package free of runtime
// dependencies wherever possible (see CLAUDE.md for the dependency policy).
//
// Contents (re-export each group from here as it lands):
//
//   - Confirm-before-update hooks   — useJsonEditorConfirm / useConfirmOnUpdate
//     https://github.com/CarlosNZ/json-edit-react/issues/307
//   - Undo / redo hook              — useUndo
//   - Reactive validation           — useValidationState / validationStyles /
//     ajvAdapter, plus the useStableValue primitive they build on
//     https://github.com/CarlosNZ/json-edit-react/issues/357
//   - Filter-function toolkit       — composable predicate builders (byKey,
//     byPath, byLevel, …) + and/or/not for the allow* props and searchFilter.
//     Exported from the `./filters` SUBPATH (`@json-edit-react/utils/filters`),
//     NOT from here, so the generic names (and/or/not/root/collections/…) don't
//     sit on the package root. See src/filters/.
//     https://github.com/CarlosNZ/json-edit-react/issues/343
//   - JSON Schema → Filter Functions generator [planned]
//     https://github.com/CarlosNZ/json-edit-react/issues/285
//   - Ready-made `searchFilter` helpers for common search use cases [planned]
//     https://github.com/CarlosNZ/json-edit-react/issues/319

// Cross-utility shared pieces (the event-name vocabulary). Internal `_common`,
// surfaced here as public API.
export * from './_common/events'

export * from './confirm-update'
export * from './undo'
export * from './stable-value'
export * from './validation'

// NOTE: the filter-function toolkit (`./filters`) is deliberately NOT re-exported
// here. It ships under its own subpath — `@json-edit-react/utils/filters` — so its
// generic builder names (`and`, `or`, `not`, `root`, `collections`, `primitives`,
// …) stay off the package root. See package.json `exports` and rollup.config.mjs.
