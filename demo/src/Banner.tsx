import { Alert, AlertIcon, Box, CloseButton, Link, useDisclosure } from '@chakra-ui/react'

const DISMISS_KEY = 'v1DemoBannerDismissedAt'
const DISMISS_LIFETIME = 3 * 7 * 24 * 60 * 60 * 1000 // 3 weeks, in ms

// Banner is dismissable, but reappears once the dismissal is older than
// DISMISS_LIFETIME so returning visitors are reminded that V2 is current.
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
        You&apos;re viewing the demo for <strong>V1</strong>. 🎉 <strong>Version 2</strong> is now
        the current release —{' '}
        <Link href="https://carlosnz.github.io/json-edit-react/" textDecoration="underline">
          try the V2 demo
        </Link>
        , or read the{' '}
        <Link
          href="https://github.com/CarlosNZ/json-edit-react/blob/main/migration-guide.md"
          isExternal
          textDecoration="underline"
        >
          migration guide
        </Link>{' '}
        to upgrade.
      </Box>
      <CloseButton onClick={dismiss} position="absolute" right={2} top={2} />
    </Alert>
  )
}
