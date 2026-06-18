import { useMemo } from 'react'
import Markdown, { type Components } from 'react-markdown'
import { Box, type BoxProps, Link, ListItem, Text, UnorderedList } from '@chakra-ui/react'
import { type ThemePalette } from './useThemePalette'

interface MarkdownTextProps extends BoxProps {
  children: string
  // When supplied, Markdown elements adopt colours from the themed editor:
  // inline code takes the number-value colour so it reads as part of the
  // header. Omit on un-themed surfaces (e.g. the index cards), where code
  // falls back to the `.code` class default.
  palette?: ThemePalette
}

// Renders a Markdown string (an example blurb or a demo data-set description),
// reproducing the demo's prose conventions: paragraphs are spaced <Text>
// blocks, lists are Chakra lists, inline code uses the `.code` class, and links
// are external Chakra links. Spread any Chakra <Box> props (color, fontSize,
// maxW, spacing…) to style the wrapper; the last block's bottom margin is
// trimmed so the surrounding spacing is the caller's to control.
export const MarkdownText = ({ children, palette, ...boxProps }: MarkdownTextProps) => {
  const components = useMemo<Components>(
    () => ({
      p: ({ children }) => (
        <Text mb={2}>{children}</Text>
      ),
      ul: ({ children }) => (
        <UnorderedList mb={2} pl={2}>
          {children}
        </UnorderedList>
      ),
      li: ({ children }) => <ListItem>{children}</ListItem>,
      code: ({ children }) => (
        <span className="code" style={palette?.number ? { color: palette.number } : undefined}>
          {children}
        </span>
      ),
      a: ({ href, children }) => (
        <Link href={href} isExternal>
          {children}
        </Link>
      ),
    }),
    [palette?.number]
  )

  return (
    <Box sx={{ '& > :last-child': { marginBottom: 0 } }} {...boxProps}>
      <Markdown components={components}>{children}</Markdown>
    </Box>
  )
}
