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
