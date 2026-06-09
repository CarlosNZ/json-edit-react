import { useMemo } from 'react'
import Markdown, { type Components } from 'react-markdown'
import { Link, Text, type TextProps } from '@chakra-ui/react'
import { type ThemePalette } from './useThemePalette'

interface MarkdownTextProps extends TextProps {
  children: string
  // When supplied, Markdown elements adopt colours from the themed editor:
  // inline code takes the number-value colour so it reads as part of the
  // header. Omit on un-themed surfaces (e.g. the index cards), where code
  // falls back to the `.code` class default.
  palette?: ThemePalette
}

// Renders a Markdown string (e.g. an example blurb) inline, reproducing the
// main demo's prose conventions: inline code uses the `.code` class, and links
// are Chakra external links. Blurbs are single-paragraph, so `p` collapses to
// a fragment and the wrapping <Text> supplies the block element + styling.
// Spread any Chakra <Text> props (color, fontSize, spacing…) to style the
// surrounding paragraph.
export const MarkdownText = ({ children, palette, ...textProps }: MarkdownTextProps) => {
  const components = useMemo<Components>(
    () => ({
      p: ({ children }) => <>{children}</>,
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
    <Text {...textProps}>
      <Markdown components={components}>{children}</Markdown>
    </Text>
  )
}
