import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  SimpleGrid,
  Spinner,
  Text,
} from '@chakra-ui/react'
import { ArrowBackIcon } from '@chakra-ui/icons'
import { defaultTheme, type Theme } from '@json-edit-react'
import { examples } from './registry'
import { ExampleThemeProvider } from './kit/ExampleThemeProvider'
import { ThemePicker } from './kit/ThemePicker'
import { CodeBlock } from './kit/CodeBlock'
import { stripCutRegions } from './kit/stripCutRegions'
import { useThemeBackground } from './kit/useThemeBackground'

// react-live is only pulled in for live examples (its own chunk).
const LiveCodeBlock = lazy(() =>
  import('./kit/LiveCodeBlock').then((m) => ({ default: m.LiveCodeBlock }))
)

const gridProps = { columns: { base: 1, lg: 2 }, spacing: 4, alignItems: 'start' } as const

const Loading = () => (
  <Center minH={200}>
    <Spinner />
  </Center>
)

export const ExamplePage = ({ slug }: { slug: string }) => {
  const navigate = useLocation()[1]
  const def = examples[slug]

  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [source, setSource] = useState<string | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const background = useThemeBackground(outputRef, theme)

  // `lazy` for the static example component; null for live (no separate module).
  const ExampleComponent = useMemo(
    () => (def?.kind === 'static' ? lazy(def.load) : null),
    [def]
  )

  useEffect(() => {
    if (!def) return
    let cancelled = false
    setSource(null)
    def.code().then((mod) => {
      if (cancelled) return
      // Static: strip demo-only scaffolding for a clean snippet. Live: the code is
      // the editable starting point, shown verbatim.
      setSource(def.kind === 'static' ? stripCutRegions(mod.default) : mod.default)
    })
    return () => {
      cancelled = true
    }
  }, [def])

  if (!def) {
    return (
      <Center minH="100vh" flexDir="column" gap={4} p={6}>
        <Heading size="md">No example named “{slug}”</Heading>
        <Button leftIcon={<ArrowBackIcon />} onClick={() => navigate('/examples')}>
          All examples
        </Button>
      </Center>
    )
  }

  const showPicker = def.theme !== false

  return (
    <Box
      minH="100vh"
      px={{ base: 4, md: 8 }}
      py={6}
      transition="background 0.4s ease"
      style={{
        backgroundColor: background.backgroundColor,
        backgroundImage: background.backgroundImage,
      }}
    >
      {/* Header sits on a translucent panel so the title stays readable over any
          theme background (incl. dark + gradient themes). */}
      <Box
        bg="rgba(255, 255, 255, 0.82)"
        backdropFilter="blur(6px)"
        borderRadius="lg"
        className="block-shadow"
        p={4}
        mb={5}
      >
        <Flex justify="space-between" align="center" wrap="wrap" gap={3} mb={2}>
          <Button
            variant="link"
            colorScheme="primaryScheme"
            leftIcon={<ArrowBackIcon />}
            onClick={() => navigate('/examples')}
          >
            All examples
          </Button>
          {showPicker && (
            <ThemePicker value={theme} onChange={setTheme} size="sm" maxW={220} />
          )}
        </Flex>
        <Heading size="lg">{def.title}</Heading>
        <Text color="gray.700" maxW="3xl" mt={1}>
          {def.blurb}
        </Text>
      </Box>

      {def.kind === 'static' ? (
        <SimpleGrid {...gridProps}>
          <Box ref={outputRef}>
            <ExampleThemeProvider theme={theme}>
              <Suspense fallback={<Loading />}>
                {ExampleComponent && <ExampleComponent />}
              </Suspense>
            </ExampleThemeProvider>
          </Box>
          {source !== null ? (
            <CodeBlock code={source} filename={`${slug}/Example.tsx`} />
          ) : (
            <Loading />
          )}
        </SimpleGrid>
      ) : source !== null ? (
        <Suspense fallback={<Loading />}>
          <LiveCodeBlock code={source} theme={theme} outputRef={outputRef} />
        </Suspense>
      ) : (
        <Loading />
      )}
    </Box>
  )
}
