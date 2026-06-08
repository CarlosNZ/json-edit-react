import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  Icon,
  SimpleGrid,
  Spinner,
  Text,
} from '@chakra-ui/react'
import { ArrowBackIcon } from '@chakra-ui/icons'
import { FaGithub, FaNpm } from 'react-icons/fa'
import { defaultTheme, type Theme } from '@json-edit-react'
import { examples } from './registry'
import { ExampleEditorProvider } from './kit/ExampleEditorProvider'
import { type ExampleEditorProps } from './kit/exampleProps'
import { ThemePicker } from './kit/ThemePicker'
import { ThemeProbe } from './kit/ThemeProbe'
import { CodeBlock } from './kit/CodeBlock'
import { stripCutRegions } from './kit/stripCutRegions'
import { useThemePalette, ExamplePaletteContext } from './kit/useThemePalette'

const MAX_WIDTH = 1080

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
  // The palette reads from a hidden, always-expanded probe editor (below) rather
  // than the visible example, so every theme colour is available regardless of
  // the example's data or collapse state.
  const probeRef = useRef<HTMLDivElement>(null)
  const palette = useThemePalette(probeRef, theme)

  // Standard props the shell injects into every static example's editor (spread
  // via `useExampleProps()` on a `// ---cut---` line, so they stay out of the
  // displayed source). Add shared presentation props here — e.g. className,
  // showCollectionCount. Memoised so the editor's prop comparison stays stable.
  const editorProps = useMemo<ExampleEditorProps>(
    () => ({ theme, maxWidth: '100%', showCollectionCount: 'when-closed' }),
    [theme]
  )

  // `lazy` for static + custom examples (both ship a component); null for live.
  const ExampleComponent = useMemo(
    () => (def?.kind === 'static' || def?.kind === 'custom' ? lazy(def.load) : null),
    [def]
  )

  useEffect(() => {
    // Custom examples have no source panel — nothing to fetch.
    if (!def || def.kind === 'custom') return
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
      style={palette.pageBg}
    >
      <Box maxW={MAX_WIDTH} mx="auto">
        <ThemeProbe ref={probeRef} theme={theme} />
        {/* Header panel adopts the editor's own theme background; its text colours
            are pulled from the editor's key / value / count elements so the chrome
            reads as part of the theme. */}
        <Box
          borderRadius="lg"
          className="block-shadow"
          px={4}
          pt={2}
          pb={4}
          mb={5}
          transition="background 0.4s ease"
          style={palette.headerBg}
        >
          <Flex justify="space-between" align="center" mb={0} h="2.2em">
            <Button
              variant="link"
              leftIcon={<ArrowBackIcon />}
              color={palette.itemCount}
              onClick={() => navigate('/examples')}
            >
              All examples
            </Button>
            {/* GitHub + npm links, matching the main demo's icons/sizing. */}
            <Flex align="center" gap={5}>
              <a
                href="https://github.com/CarlosNZ/json-edit-react"
                target="_blank"
                rel="noreferrer"
              >
                <Icon boxSize="2em" as={FaGithub} color={palette.string} />
              </a>
              <a
                href="https://www.npmjs.com/package/json-edit-react"
                target="_blank"
                rel="noreferrer"
              >
                <Icon boxSize="3em" as={FaNpm} color={palette.string} />
              </a>
            </Flex>
          </Flex>
          <Heading size="lg" color={palette.property}>
            {def.title}
          </Heading>
          <Text color={palette.string} maxW="3xl" mt={1}>
            {def.blurb}
          </Text>
          {showPicker && (
            <Flex justify="flex-end" mt={2}>
              <ThemePicker value={theme} onChange={setTheme} size="sm" maxW={220} />
            </Flex>
          )}
        </Box>

        {def.kind === 'custom' ? (
          // A bespoke interactive page: full-width, no source panel. Wrapped so
          // it can spread `useExampleProps()` onto its editor and read the
          // palette (via `useExamplePalette`) to theme its own chrome.
          <ExamplePaletteContext.Provider value={palette}>
            <ExampleEditorProvider value={editorProps}>
              <Suspense fallback={<Loading />}>
                {ExampleComponent && <ExampleComponent />}
              </Suspense>
            </ExampleEditorProvider>
          </ExamplePaletteContext.Provider>
        ) : def.kind === 'static' ? (
          <SimpleGrid {...gridProps}>
            {/* Shadow hugs the editor's own rounded container (like the main demo,
                which puts `.block-shadow` on the JsonEditor). Applied via `sx`
                because the editor lives inside the className-free example component;
                same value as the `.block-shadow` rule in style.css. */}
            <Box
              className="block-shadow"
              borderRadius="md"
              // sx={{ '& .jer-editor-container': { boxShadow: 'rgba(0, 0, 0, 0.24) 0px 3px 8px' } }}
            >
              <ExampleEditorProvider value={editorProps}>
                <Suspense fallback={<Loading />}>
                  {ExampleComponent && <ExampleComponent />}
                </Suspense>
              </ExampleEditorProvider>
            </Box>
            {source !== null ? (
              <CodeBlock
                code={source}
                filename={`${slug}/Example.tsx`}
                themeName={theme.displayName}
              />
            ) : (
              <Loading />
            )}
          </SimpleGrid>
        ) : source !== null ? (
          <Suspense fallback={<Loading />}>
            <LiveCodeBlock code={source} theme={theme} />
          </Suspense>
        ) : (
          <Loading />
        )}
      </Box>
    </Box>
  )
}
