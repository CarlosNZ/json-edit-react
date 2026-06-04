// @json-edit-react/utils — public entry point.
//
// Utility hooks and helpers that are useful alongside json-edit-react but
// don't belong in the zero-dependency core. Keep this package free of runtime
// dependencies wherever possible (see CLAUDE.md for the dependency policy).
//
// Planned contents (re-export each group from here as it lands):
//
//   - Confirm-before-update hooks   — useJsonEditorConfirm / useConfirmOnUpdate
//                                     https://github.com/CarlosNZ/json-edit-react/issues/307
//   - JSON Schema → Filter Functions generator
//                                     https://github.com/CarlosNZ/json-edit-react/issues/285
//   - Ready-made `searchFilter` helpers for common search use cases
//                                     https://github.com/CarlosNZ/json-edit-react/issues/319
//
// e.g.  export * from './confirm'
//       export * from './schema'
//       export * from './search'

export {}
