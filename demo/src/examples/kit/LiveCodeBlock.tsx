import { type RefObject } from 'react'
import { Box, Flex, SimpleGrid, Text } from '@chakra-ui/react'
import { LiveProvider, LiveEditor, LivePreview, LiveError } from 'react-live'
import { type Theme } from '@json-edit-react'
import { liveScope } from './liveScope'

interface LiveCodeBlockProps {
  code: string
  theme: Theme
  // Attached to the preview so the page can read the editor's themed background.
  outputRef: RefObject<HTMLDivElement | null>
}

// The editable tier: react-live transpiles the snippet in-browser and renders it.
// Output on the left (mirrors the static layout), editable code on the right. The
// selected `theme` is injected into scope so the editable code can reference it.
export const LiveCodeBlock = ({ code, theme, outputRef }: LiveCodeBlockProps) => (
  <LiveProvider code={code} scope={{ ...liveScope, theme }} noInline>
    <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} alignItems="start">
      <Box ref={outputRef}>
        <LivePreview />
      </Box>
      <Box borderRadius="md" overflow="hidden" className="block-shadow" bg="#1e1e1e">
        <Flex px={3} py={1.5} bg="#2d2d2d">
          <Text fontSize="xs" fontFamily="mono" color="gray.300">
            ▶ editable — change anything and watch the output
          </Text>
        </Flex>
        <Box
          fontSize="sm"
          overflow="auto"
          maxH="70vh"
          sx={{ '& textarea:focus': { outline: 'none' }, '& pre': { margin: 0 } }}
        >
          <LiveEditor />
        </Box>
        {/* LiveError renders a <pre> only when the code throws; style it via CSS
            so we don't depend on it forwarding style props. */}
        <Box
          sx={{
            '& pre': {
              color: '#ff8585',
              background: '#3a1a1a',
              fontSize: '12px',
              fontFamily: 'mono',
              whiteSpace: 'pre-wrap',
              margin: 0,
              padding: '8px 12px',
            },
          }}
        >
          <LiveError />
        </Box>
      </Box>
    </SimpleGrid>
  </LiveProvider>
)
