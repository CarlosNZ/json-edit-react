import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Box, Flex, Text, IconButton, Tooltip, useClipboard } from '@chakra-ui/react'
import { CopyIcon, CheckIcon } from '@chakra-ui/icons'
import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

// JER theme display-name → Shiki bundled theme. Names without a direct Shiki
// equivalent fall back to a light/dark theme that suits their palette.
const SHIKI_FOR_JER: Record<string, string> = {
  'Github Dark': 'github-dark',
  'Github Light': 'github-light',
  'White & Black': 'github-light',
  'Black & White': 'github-dark',
  'Candy Wrapper': 'github-light',
  Psychedelic: 'dracula',
  'Solarized Dark': 'solarized-dark',
  'Solarized Light': 'solarized-light',
  Dracula: 'dracula',
  Monokai: 'monokai',
  'Tokyo Night': 'tokyo-night',
  r18jv: 'github-light', // light theme; no direct Shiki equivalent
  TMF: 'github-light', // warm light theme; no direct Shiki equivalent
}
const DEFAULT_SHIKI = 'github-light'

// Explicit per-theme imports (not a dynamic template) so only the themes we map
// to get bundled — each lands in its own small lazy chunk.
const themeLoaders: Record<string, () => Promise<unknown>> = {
  'github-light': () => import('@shikijs/themes/github-light'),
  'github-dark': () => import('@shikijs/themes/github-dark'),
  dracula: () => import('@shikijs/themes/dracula'),
  monokai: () => import('@shikijs/themes/monokai'),
  'solarized-dark': () => import('@shikijs/themes/solarized-dark'),
  'solarized-light': () => import('@shikijs/themes/solarized-light'),
  'tokyo-night': () => import('@shikijs/themes/tokyo-night'),
}

// Fine-grained Shiki: only the tsx grammar + the JS regex engine up front (no
// bundled-language explosion, no oniguruma WASM). Themes load on demand.
let highlighterPromise: Promise<HighlighterCore> | null = null
const loaded = new Set<string>([DEFAULT_SHIKI])
const getHighlighter = () => {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      langs: [import('@shikijs/langs/tsx')],
      themes: [import('@shikijs/themes/github-light')],
      engine: createJavaScriptRegexEngine({ forgiving: true }),
    })
  }
  return highlighterPromise
}

interface Highlighted {
  html: string
  bg: string
  fg: string
}

const highlight = async (code: string, jerThemeName?: string): Promise<Highlighted> => {
  const name = (jerThemeName && SHIKI_FOR_JER[jerThemeName]) || DEFAULT_SHIKI
  const hl = await getHighlighter()
  if (!loaded.has(name)) {
    await hl.loadTheme(themeLoaders[name]() as Parameters<typeof hl.loadTheme>[0])
    loaded.add(name)
  }
  const { bg, fg } = hl.getTheme(name)
  return { html: hl.codeToHtml(code, { lang: 'tsx', theme: name }), bg, fg }
}

interface CodeBlockProps {
  code: string
  filename?: string
  // JER theme display name; the panel picks a matching Shiki theme + chrome.
  themeName?: string
}

// Read-only source display. Shiki is dynamically imported on first render so
// its grammar/theme/engine stay in their own lazy chunk. The header bar adopts
// the Shiki theme's own bg/fg so the whole block reads as one themed panel.
// Breathing room between the pinned panel and the viewport edges (matches the
// sticky `top` offset the example layout pins it at).
const VIEWPORT_GAP_PX = 16

// When the space below the undocked panel is no more than this, it's just the
// page's bottom chrome (its padding) — so the fill snaps to make the page fit
// exactly rather than overflow by those few px and raise a scrollbar. More than
// this means a tall data pane sits below the fold, so the page scrolls anyway.
const PAGE_FIT_SLACK_PX = 64

// Second snap trigger: this long after the last scroll, an undocked panel
// re-fills its bottom to the viewport edge at wherever the user stopped. On a
// short page the header never scrolls out, so the dock crossover never fires
// and the panel would otherwise sit short.
const SCROLL_SETTLE_MS = 500

export const CodeBlock = ({ code, filename, themeName }: CodeBlockProps) => {
  const [{ html, bg, fg }, setResult] = useState<Highlighted>({ html: '', bg: '#fff', fg: '#000' })
  const { hasCopied, onCopy } = useClipboard(code)

  // The panel docks like a sticky sidebar (see SplitPane's stickyRight). Two
  // discrete states; the height changes only at a snap point, never every
  // scroll frame (that per-frame resize was the slow part):
  //  - UNDOCKED: a fixed pixel height. It HOLDS that height as the page
  //    scrolls — riding up with it — so scrolling never yanks it around.
  //  - DOCKED: once its top reaches the sticky offset (header gone), maxH flips
  //    to fill the viewport and it stays pinned there.
  // Two triggers re-snap the undocked bottom to the viewport edge: the dock
  // crossover in either direction (header leaving or coming back), and — for
  // short pages where the header never leaves — settling for SCROLL_SETTLE_MS
  // after the last scroll. The code body scrolls internally in BOTH states, so
  // a short-data page (whose page never scrolls) can still scroll a long
  // snippet. Capture-phase listening catches scrolls from any container, not
  // just the window.
  const panelRef = useRef<HTMLDivElement>(null)
  const dockedRef = useRef(false)
  const [docked, setDocked] = useState(false)
  // Fill height while undocked. Null until the first fit, so the first paint
  // hugs content rather than flashing a guessed height.
  const [fillHeight, setFillHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = panelRef.current
    if (!el) return
    let raf = 0
    let settleTimer = 0
    // Space to leave below the panel: when that's just the page's bottom chrome
    // (its padding), subtract it so a short data pane fits without a stray
    // scrollbar; otherwise a tall pane is below the fold and the plain gap is
    // right.
    const insetBelow = (rect: DOMRect) => {
      const below = document.documentElement.scrollHeight - (rect.bottom + window.scrollY)
      return below > 0 && below <= PAGE_FIT_SLACK_PX ? below : VIEWPORT_GAP_PX
    }
    // Set the undocked fill height so the panel's bottom meets the viewport edge
    // at its current (live) position.
    const fillToBottom = () => {
      const rect = el.getBoundingClientRect()
      setFillHeight(Math.max(0, window.innerHeight - rect.top - insetBelow(rect)))
    }
    // Flip docked state when the panel's top crosses the sticky offset (header
    // gone ⇄ back). Returns true on the frame the state changes.
    const syncDocked = () => {
      const isDocked = el.getBoundingClientRect().top <= VIEWPORT_GAP_PX + 0.5
      if (isDocked === dockedRef.current) return false
      dockedRef.current = isDocked
      setDocked(isDocked)
      return true
    }
    // During a scroll the panel HOLDS its height and rides with the page; the
    // only per-frame work is tracking the dock crossover. We re-fill solely on
    // the hand-off back to undocked (header returning, trigger #1) — never mid-
    // scroll — so scrolling back up doesn't yank the panel away.
    const onFrame = () => {
      raf = 0
      if (syncDocked() && !dockedRef.current) fillToBottom()
    }
    // Trigger #2: once scrolling has settled, re-fill an undocked panel's bottom
    // to the viewport edge wherever the user stopped. Docked panels already
    // fill, so skip them.
    const onSettle = () => {
      settleTimer = 0
      if (!dockedRef.current) fillToBottom()
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(onFrame)
      if (settleTimer) clearTimeout(settleTimer)
      settleTimer = window.setTimeout(onSettle, SCROLL_SETTLE_MS)
    }
    // A resize relays out the page, so re-fit immediately rather than waiting
    // for a settle.
    const onResize = () => {
      syncDocked()
      if (!dockedRef.current) fillToBottom()
    }
    // Initial fit.
    syncDocked()
    if (!dockedRef.current) fillToBottom()
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      if (settleTimer) clearTimeout(settleTimer)
      window.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    highlight(code, themeName).then((result) => {
      if (!cancelled) setResult(result)
    })
    return () => {
      cancelled = true
    }
  }, [code, themeName])

  // Docked: fill the viewport (top at the sticky offset, bottom near its edge).
  // Undocked: the fixed fill height, scrolling with the page. A flex column:
  // header pinned, body below it scrolls internally in both states.
  const panelMaxH = docked
    ? `calc(100vh - ${2 * VIEWPORT_GAP_PX}px)`
    : fillHeight != null
      ? `${fillHeight}px`
      : undefined

  return (
    <Box
      ref={panelRef}
      borderRadius="md"
      overflow="hidden"
      className="block-shadow"
      bg={bg}
      display="flex"
      flexDirection="column"
      maxH={panelMaxH}
    >
      <Flex
        align="center"
        justify="space-between"
        px={3}
        py={1.5}
        borderBottom="1px solid"
        borderColor="blackAlpha.200"
        flexShrink={0}
      >
        <Text fontSize="xs" fontFamily="mono" color={fg} opacity={0.65}>
          {filename}
        </Text>
        <Tooltip label={hasCopied ? 'Copied!' : 'Copy'} closeOnClick={false}>
          <IconButton
            aria-label="Copy code to clipboard"
            size="xs"
            variant="ghost"
            color={fg}
            icon={hasCopied ? <CheckIcon /> : <CopyIcon />}
            onClick={onCopy}
          />
        </Tooltip>
      </Flex>
      {html ? (
        // Shiki output is a <pre class="shiki"> with inline styles.
        <Box
          fontSize="sm"
          overflow="auto"
          // Fill the remaining height below the header and scroll within it
          // (minH:0 lets a flex child shrink below its content so it actually
          // scrolls rather than overflowing the panel).
          flex="1 1 auto"
          minH={0}
          // Soft-wrap long lines instead of scrolling horizontally. `pre-wrap`
          // keeps indentation/newlines; `overflow-wrap` handles unbreakable
          // tokens.
          sx={{
            '& pre': { margin: 0, padding: '1em', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <Box
          as="pre"
          fontSize="sm"
          fontFamily="mono"
          overflow="auto"
          flex="1 1 auto"
          minH={0}
          m={0}
          p="1em"
        >
          {code}
        </Box>
      )}
    </Box>
  )
}
