// @json-edit-react/utils — public entry point.
//
// Utility hooks and helpers that are useful alongside json-edit-react but
// don't belong in the zero-dependency core. Keep this package free of runtime
// dependencies wherever possible (see CLAUDE.md for the dependency policy).
//
// Contents (re-export each group from here as it lands):
//
//   - Confirm-before-update hooks   — useJsonEditorConfirm / useConfirmOnUpdate
//                                     https://github.com/CarlosNZ/json-edit-react/issues/307
//   - JSON Schema → Filter Functions generator [planned]
//                                     https://github.com/CarlosNZ/json-edit-react/issues/285
//   - Ready-made `searchFilter` helpers for common search use cases [planned]
//                                     https://github.com/CarlosNZ/json-edit-react/issues/319

export * from './confirm-update'
