import { extendTheme } from '@chakra-ui/react'

import colors from './colours'
import fonts from './fonts'
import components from './components'

const theme = extendTheme({
  styles: {
    global: {
      'html, body': { bgColor: 'background', fontSize: '14px' },
      a: {
        color: 'brandDark.700',
        fontWeight: 600,
        _hover: { color: 'brandDark.600', textDecoration: 'underline' },
      },
    },
  },
  config: {
    initialColorMode: 'light',
  },
  textStyles: {
    mono: {
      fontFamily: 'mono',
      color: 'gray.600',
    },
  },
  colors,
  fonts,
  components,
})

export default theme
