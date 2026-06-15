import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { Router, Route, Switch } from 'wouter'
import './index.css'
import App from './App.tsx'
import { ChakraProvider, Flex, Spinner } from '@chakra-ui/react'
import theme from './chakra-theme/index.ts'

// The frozen V1 demo is lazy-loaded so V2 users never download it (or the
// pinned `json-edit-react-v1` package). It self-provides its own
// ChakraProvider, so the Suspense fallback below must be plain HTML (no Chakra
// ancestor yet on `/v1`).
const AppV1 = lazy(() => import('./v1/index.tsx'))

// Targeted, single-concept examples. Lazy-loaded so the main demo (`/`) never
// pulls in the examples code (or its shiki/react-live deps).
const ExamplePage = lazy(() =>
  import('./examples/ExamplePage').then((m) => ({ default: m.ExamplePage }))
)
const ExamplesIndex = lazy(() =>
  import('./examples/ExamplesIndex').then((m) => ({ default: m.ExamplesIndex }))
)

// A bare editor rendered with no ChakraProvider / UI-framework reset, as a
// reference for how the library looks for a plain-HTML consumer. Lazy-loaded so
// it stays out of the main entry chunk.
const RawHtmlPage = lazy(() =>
  import('./RawHtmlPage').then((m) => ({ default: m.RawHtmlPage }))
)

const exampleFallback = (
  <Flex h="100vh" justify="center" align="center">
    <Spinner />
  </Flex>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router base="/json-edit-react">
      <Switch>
        <Route path="/v1">
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>}>
            <AppV1 />
          </Suspense>
        </Route>
        <Route path="/examples/:slug">
          {({ slug }) => (
            <ChakraProvider theme={theme}>
              <Suspense fallback={exampleFallback}>
                <ExamplePage slug={slug} />
              </Suspense>
            </ChakraProvider>
          )}
        </Route>
        <Route path="/examples">
          <ChakraProvider theme={theme}>
            <Suspense fallback={exampleFallback}>
              <ExamplesIndex />
            </Suspense>
          </ChakraProvider>
        </Route>
        <Route path="/raw-html">
          {/* Intentionally NOT wrapped in ChakraProvider — see RawHtmlPage. */}
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>}>
            <RawHtmlPage />
          </Suspense>
        </Route>
        <Route>
          <ChakraProvider theme={theme}>
            <App />
          </ChakraProvider>
        </Route>
      </Switch>
    </Router>
  </StrictMode>
)
