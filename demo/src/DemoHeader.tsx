import { lazy, Suspense } from 'react'
import { Flex, Heading, HStack, Icon, Link, Text, VStack } from '@chakra-ui/react'
import { FaExternalLinkAlt, FaGithub, FaNpm } from 'react-icons/fa'
import logoSVG from './image/logo.svg'

const SourceIndicator = lazy(() => import('./SourceIndicator'))

// Page header: source indicator, title/tagline, and the GitHub/npm links.
// Purely presentational — takes no props.
export const DemoHeader = () => (
  <HStack w="100%" justify="space-between" align="flex-start">
    <Suspense fallback={null}>
      <SourceIndicator />
    </Suspense>

    <VStack align="flex-start" gap={3}>
      <HStack align="flex-end" mt={2} gap={4} flexWrap="wrap">
        <Flex gap={4} align="center">
          <img src={logoSVG} alt="logo" style={{ maxHeight: '3.5em' }} />
          <Heading as="h1" size="3xl" variant="other">
            json-edit-<span style={{ color: '#EA3788' }}>react</span>
          </Heading>
        </Flex>
        <Text pb={0.5} variant="primary">
          by{' '}
          <Link href="https://github.com/CarlosNZ" isExternal>
            <strong>@CarlosNZ</strong>
          </Link>
        </Text>
      </HStack>
      <Heading variant="sub">
        A <span style={{ color: '#011C27' }}>React</span> component for editing or viewing
        JSON/object data •{' '}
        <Link href="https://github.com/CarlosNZ/json-edit-react#readme" isExternal color="accent">
          Docs <Icon boxSize={4} as={FaExternalLinkAlt} />
        </Link>
      </Heading>
    </VStack>
    <Flex align="center" gap={5}>
      <a href="https://github.com/CarlosNZ/json-edit-react" target="_blank" rel="noreferrer">
        <Icon boxSize="2em" as={FaGithub} color="secondary" />
      </a>
      <a href="https://www.npmjs.com/package/json-edit-react" target="_blank" rel="noreferrer">
        <Icon boxSize="3em" as={FaNpm} color="secondary" />
      </a>
    </Flex>
  </HStack>
)
