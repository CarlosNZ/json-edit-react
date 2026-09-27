import { Alert, AlertIcon, Box, CloseButton, Link, useDisclosure } from '@chakra-ui/react'

const DISMISS_KEY = 'v2ReleaseBannerDismissedAt'
const DISMISS_LIFETIME = 3 * 7 * 24 * 60 * 60 * 1000 // 3 weeks, in ms

// Banner is dismissable, but reappears once the dismissal is older than
// DISMISS_LIFETIME so returning visitors see the V2 announcement again.
const wasRecentlyDismissed = () => {
  const dismissedAt = Number(localStorage.getItem(DISMISS_KEY))
  if (!dismissedAt) return false
  return Date.now() - dismissedAt < DISMISS_LIFETIME
}

export const Banner = () => {
  const { isOpen, onClose } = useDisclosure({ defaultIsOpen: !wasRecentlyDismissed() })

  if (!isOpen) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    onClose()
  }

  return (
    <Alert status="info" variant="solid" justifyContent="center">
      <AlertIcon />
      <Box>
        🎉 <strong>Version 2 is here!</strong> Upgrading from V1? Be sure to follow the{' '}
        <Link
          href="https://github.com/CarlosNZ/json-edit-react/blob/main/migration-guide.md"
          isExternal
          textDecoration="underline"
        >
          migration guide
        </Link>
        . Looking for V1? See the{' '}
        <Link
          href="https://carlosnz.github.io/json-edit-react-v1/"
          isExternal
          textDecoration="underline"
        >
          V1 demo
        </Link>{' '}
        and{' '}
        <Link
          href="https://github.com/CarlosNZ/json-edit-react/tree/v1.x#readme"
          isExternal
          textDecoration="underline"
        >
          V1 docs
        </Link>
        .
      </Box>
      <CloseButton onClick={dismiss} position="absolute" right={2} top={2} />
    </Alert>
  )
}
