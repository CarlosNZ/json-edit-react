import { useEffect, useState } from 'react'
import { Box, Flex, Text, IconButton, Tooltip, useClipboard } from '@chakra-ui/react'
import { CopyIcon, CheckIcon } from '@chakra-ui/icons'
import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

const SHIKI_THEME = 'github-light'

// Fine-grained Shiki: load *only* the tsx grammar + one theme + the JS regex
// engine. This avoids the bundled highlighter, which pulls in every language
// grammar and the ~600 kB oniguruma WASM. Created once, lazily, and shared.
let highlighterPromise: Promise<HighlighterCore> | null = null
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

interface CodeBlockProps {
  code: string
  filename?: string
}

// Read-only source display. Shiki is dynamically imported on first render so its
// grammar/theme/engine stay in their own lazy chunk (never in the `/` entry).
// Until it resolves, a plain <pre> stands in so there's no flash of empty space.
export const CodeBlock = ({ code, filename }: CodeBlockProps) => {
  const [html, setHtml] = useState('')
  const { hasCopied, onCopy } = useClipboard(code)

  useEffect(() => {
    let cancelled = false
    getHighlighter().then((highlighter) => {
      if (cancelled) return
      setHtml(highlighter.codeToHtml(code, { lang: 'tsx', theme: SHIKI_THEME }))
    })
    return () => {
      cancelled = true
    }
  }, [code])

  return (
    <Box borderRadius="md" overflow="hidden" className="block-shadow" bg="#fff">
      <Flex
        align="center"
        justify="space-between"
        px={3}
        py={1.5}
        bg="#f0f0f0"
        borderBottom="1px solid"
        borderColor="gainsboro"
      >
        <Text fontSize="xs" fontFamily="mono" color="gray.600">
          {filename}
        </Text>
        <Tooltip label={hasCopied ? 'Copied!' : 'Copy'} closeOnClick={false}>
          <IconButton
            aria-label="Copy code to clipboard"
            size="xs"
            variant="ghost"
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
          sx={{ '& pre': { margin: 0, padding: '1em' } }}
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
