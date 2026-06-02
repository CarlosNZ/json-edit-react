import { ChakraProvider } from '@chakra-ui/react'
import App from './App'
import theme from './chakra-theme'

// Lazy entry for the frozen V1 demo. It self-provides its own ChakraProvider
// (with the V1 chrome theme) so it stays isolated from the V2 app and the whole
// page — including the pinned `json-edit-react-v1` package — only loads on `/v1`.
const AppV1 = () => (
  <ChakraProvider theme={theme}>
    <App />
  </ChakraProvider>
)

export default AppV1
