import { useEffect, useState } from 'react'
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
export const CodeBlock = ({ code, filename, themeName }: CodeBlockProps) => {
  const [{ html, bg, fg }, setResult] = useState<Highlighted>({ html: '', bg: '#fff', fg: '#000' })
  const { hasCopied, onCopy } = useClipboard(code)

  useEffect(() => {
    let cancelled = false
    highlight(code, themeName).then((result) => {
      if (!cancelled) setResult(result)
    })
    return () => {
      cancelled = true
    }
  }, [code, themeName])

  return (
    <Box borderRadius="md" overflow="hidden" className="block-shadow" bg={bg}>
      <Flex
        align="center"
        justify="space-between"
        px={3}
        py={1.5}
        borderBottom="1px solid"
        borderColor="blackAlpha.200"
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
          maxH="70vh"
          // Soft-wrap long lines instead of scrolling horizontally. `pre-wrap`
          // keeps indentation/newlines; `overflow-wrap` handles unbreakable
          // tokens.
          sx={{
            '& pre': { margin: 0, padding: '1em', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <Box as="pre" fontSize="sm" fontFamily="mono" overflow="auto" maxH="70vh" m={0} p="1em">
          {code}
        </Box>
      )}
    </Box>
  )
}
