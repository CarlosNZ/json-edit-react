import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { Box, Button, Center, Flex, Heading, Icon, Spinner, useToast } from '@chakra-ui/react'
import { ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import { FaGithub, FaNpm } from 'react-icons/fa'
import { defaultTheme, type Theme } from '@json-edit-react'
import { examples } from './registry'
import { ExampleEditorProvider } from './kit/ExampleEditorProvider'
import { type ExampleEditorProps } from './kit/exampleProps'
import { ThemePicker } from './kit/ThemePicker'
import { ThemeProbe } from './kit/ThemeProbe'
import { CodeBlock } from './kit/CodeBlock'
import { MarkdownText } from './kit/MarkdownText'
import { SplitPane } from './kit/SplitPane'
import { prepareExampleSource } from './kit/prepareExampleSource'
import { useThemePalette, ExamplePaletteContext } from './kit/useThemePalette'

// The header and any non-split content stay at this width, centred.
const HEADER_MAX_WIDTH = 1080
// The split view breaks out wider so its panes can be dragged out into the
// margins; capped so it doesn't sprawl on ultrawide displays. The band still
// starts centred at HEADER_MAX_WIDTH (see SplitPane), so it aligns with the
// header until the user drags an edge outward.
const PANE_MAX_WIDTH = 1800

// react-live is only pulled in for live examples (its own chunk).
const LiveCodeBlock = lazy(() =>
  import('./kit/LiveCodeBlock').then((m) => ({ default: m.LiveCodeBlock }))
)

const SourceIndicator = lazy(() => import('../SourceIndicator'))

const Loading = () => (
  <Center minH={200}>
    <Spinner />
  </Center>
)

export const ExamplePage = ({ slug }: { slug: string }) => {
  const navigate = useLocation()[1]
  const def = examples[slug]

  // Injected into every rendered example (see ExampleComponentProps) so an
  // example can surface its event stream as notifications — the shell owns the
  // toast styling, the example just fires it.
  const toast = useToast()

  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [source, setSource] = useState<string | null>(null)
  // The palette reads from a hidden, always-expanded probe editor (below)
  // rather than the visible example, so every theme colour is available
  // regardless of the example's data or collapse state.
  const probeRef = useRef<HTMLDivElement>(null)
  const palette = useThemePalette(probeRef, theme)

  // Standard props the shell injects into every static example's editor (spread
  // via `useExampleProps()` on a `// ---cut---` line, so they stay out of the
  // displayed source). Add shared presentation props here — e.g. className,
  // showCollectionCount. Memoised so the editor's prop comparison stays stable.
  const editorProps = useMemo<ExampleEditorProps>(
    () => ({ theme, maxWidth: '100%', showCollectionCount: 'when-collapsed' }),
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
      // Static: strip demo-only scaffolding for a clean snippet. Live: the code
      // is the editable starting point, shown verbatim.
      setSource(def.kind === 'static' ? prepareExampleSource(mod.default) : mod.default)
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
  // Examples that mirror a demo data set deep-link to it; others go to the
  // demo's default view. (Both resolve to `<App />` via the catch-all route.)
  const demoUrl = def.demoDataSet ? `/?data=${def.demoDataSet}` : '/'

  return (
    <Box
      minH="100vh"
      px={{ base: 4, md: 8 }}
      py={6}
      transition="background 0.4s ease"
      style={palette.pageBg}
    >
      <ThemeProbe ref={probeRef} theme={theme} />
      <Suspense fallback={null}>
        <SourceIndicator />
      </Suspense>
      {/* The header stays at the header width; the example content below breaks
          out wider so its split panes can be dragged out into the margins. */}
      <Box maxW={HEADER_MAX_WIDTH} mx="auto">
        {/* Header panel adopts the editor's own theme background; its text
            colours are pulled from the editor's key / value / count elements
            so the chrome reads as part of the theme. */}
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
              color={palette.property}
              onClick={() => window.history.back()}
            >
              Back
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
          <MarkdownText palette={palette} color={palette.string} fontSize={16} maxW="6xl" mt={1}>
            {def.blurb}
          </MarkdownText>
          <Flex direction="column" align="flex-end" gap={2} mt={2}>
            <Button
              variant="link"
              size="sm"
              rightIcon={<ArrowForwardIcon />}
              color={palette.property}
              onClick={() => navigate(demoUrl)}
            >
              Go to Demo site
            </Button>
            {showPicker && (
              <ThemePicker value={theme} onChange={setTheme} size="sm" maxW={220} />
            )}
          </Flex>
        </Box>
      </Box>

      {/* Every content kind shares one wide, centred wrapper and the palette
          context (so SplitPane can theme its grips). The split band defaults
          to the header width, so it lines up with the header until dragged
          wider. */}
      <ExamplePaletteContext.Provider value={palette}>
        <Box maxW={PANE_MAX_WIDTH} mx="auto">
          {def.kind === 'custom' && (
            // A bespoke interactive page: no source panel. The editor provider
            // lets it spread `useExampleProps()`; it reads the palette (via
            // `useExamplePalette`) to theme its own chrome.
            <ExampleEditorProvider value={editorProps}>
              <Suspense fallback={<Loading />}>
                {ExampleComponent && <ExampleComponent toast={toast} />}
              </Suspense>
            </ExampleEditorProvider>
          )}

          {def.kind === 'static' && (
            // Drag a handle — the band's left edge, the centre divider, or its
            // right edge — to trade width between editor and code, or pull the
            // band out into the margins (e.g. widen the code). Stacks below
            // `lg`.
            <SplitPane
              storageId={slug}
              left={
                // Shadow hugs the editor's own rounded container (like the main
                // demo, which puts `.block-shadow` on the JsonEditor).
                <Box className="block-shadow" borderRadius="md">
                  <ExampleEditorProvider value={editorProps}>
                    <Suspense fallback={<Loading />}>
                      {ExampleComponent && <ExampleComponent toast={toast} />}
                    </Suspense>
                  </ExampleEditorProvider>
                </Box>
              }
              right={
                source !== null ? (
                  <CodeBlock
                    code={source}
                    filename={`${slug}/Example.tsx`}
                    themeName={theme.displayName}
                  />
                ) : (
                  <Loading />
                )
              }
            />
          )}

          {def.kind === 'live' &&
            (source !== null ? (
              <Suspense fallback={<Loading />}>
                <LiveCodeBlock code={source} theme={theme} storageId={slug} />
              </Suspense>
            ) : (
              <Loading />
            ))}
        </Box>
      </ExamplePaletteContext.Provider>
    </Box>
  )
}
