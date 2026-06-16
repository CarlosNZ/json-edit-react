// Editor-slot widgets — components that satisfy JsonEditor's UI-control
// contracts (`Select`, `TextEditor`) to replace a built-in widget, rather
// than render a node type. Shipped under the `@json-edit-react/components/widgets`
// subpath, kept off the package root so the root barrel is uniformly
// custom-node definitions.
export * from './ReactSelect'
export * from './CodeEditor'
