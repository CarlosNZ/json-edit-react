// `@types/react-dom` isn't a project dependency (React DOM reaches the tests
// only through React Testing Library, which ships its own types). The SSR
// test imports `react-dom/server` directly, so declare the one entry point it
// uses here rather than pulling in the whole types package.
declare module 'react-dom/server' {
  import type { ReactElement } from 'react'
  export function renderToString(element: ReactElement): string
  export function renderToStaticMarkup(element: ReactElement): string
}
