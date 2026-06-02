import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { Router, Route, Switch } from 'wouter'
import './index.css'
import App from './App.tsx'
import { ChakraProvider } from '@chakra-ui/react'
import theme from './chakra-theme/index.ts'

// The frozen V1 demo is lazy-loaded so V2 users never download it (or the pinned
// `json-edit-react-v1` package). It self-provides its own ChakraProvider, so the
// Suspense fallback below must be plain HTML (no Chakra ancestor yet on `/v1`).
const AppV1 = lazy(() => import('./v1/index.tsx'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router base="/json-edit-react">
      <Switch>
        <Route path="/v1">
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>}>
            <AppV1 />
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
