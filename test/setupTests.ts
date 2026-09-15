import '@testing-library/jest-dom'

// Silence the intentional `console.warn('Error', ...)` in showError
// (src/hooks/useCommon.ts) during tests. It's a deliberate runtime debugging
// aid that fires every time an error path is exercised (invalid JSON, key
// collision, update failure, etc.) and would otherwise dominate test output.
// Other warnings still surface normally.
const realWarn = console.warn
console.warn = (...args: Parameters<typeof console.warn>) => {
  if (typeof args[0] === 'string' && args[0] === 'Error') return
  realWarn.apply(console, args)
}

// The drag-and-drop engine is loaded on demand — `DragSourceProvider` pulls it
// in with a dynamic `import()` when `allowDrag` is set (see
// src/hooks/dragAndDrop.tsx). Evaluating it here registers it up front, so
// every editor in the suite mounts with drag wired synchronously (as in a
// browser once the chunk is cached) and tests can fire drag events straight
// after `render()`. The on-demand path itself is covered by
// test/dragAndDropLazy.test.tsx.
import '../src/hooks/dragAndDrop'
