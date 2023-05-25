// import { theme as base } from '@chakra-ui/react'

const components = {
  Heading: {
    baseStyle: { color: 'primary' },
    variants: {
      sub: {
        fontFamily: 'Work Sans, sans-serif',
        color: 'secondary',
        fontWeight: 'bold',
        fontSize: '1.4em',
      },
      accent: { color: 'accent' },
    },
  },
  Text: {
    baseStyle: { color: 'secondary', fontSize: 16 },
    variants: {
      primary: { color: 'primary' },
      accent: { color: 'accent' },
      altAccent: { color: 'jetBlack' },
    },
  },
  Button: {
    // baseStyle: { colorScheme: 'accentScheme' },
  },
}
export default components
