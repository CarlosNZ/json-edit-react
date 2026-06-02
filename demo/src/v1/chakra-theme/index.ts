import { extendTheme } from '@chakra-ui/react'

import colors from './colours'
import fonts from './fonts'
import components from './components'

const theme = extendTheme({
  styles: {
    global: {
      'html, body': {
        // background:
        //   'radial-gradient(circle, hsla(191, 53%, 85%, 1) 0%, hsla(192, 45%, 67%, 1) 100%);',
        backgroundColor: 'background',
        height: '100vh',
        fontSize: '14px',
      },
      a: {
        // color: 'brandDark.700',
        fontWeight: 600,
        _hover: { textDecoration: 'underline' },
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
