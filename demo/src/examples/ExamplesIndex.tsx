import { useLocation } from 'wouter'
import { Box, Heading, Image, SimpleGrid, Text } from '@chakra-ui/react'
import { examples } from './registry'
import { MarkdownText } from './kit/MarkdownText'

// shields.io badge per example kind. Green = a static live example; pink (the
// json-edit-react accent) = an editable react-live playground; purple = a
// bespoke interactive page.
const kindBadge = {
  static: {
    src: 'https://img.shields.io/badge/Live_example-3DA639?style=flat&logo=react&logoColor=white',
    alt: 'Live example',
  },
  live: {
    src: 'https://img.shields.io/badge/Editable_playground-EA3788?style=flat&logo=react&logoColor=white',
    alt: 'Editable playground',
  },
  custom: {
    src: 'https://img.shields.io/badge/Interactive-8957E5?style=flat&logo=react&logoColor=white',
    alt: 'Interactive',
  },
} as const

// Landing page listing every registered example. Data-driven from the registry,
// so a new entry shows up here automatically.
export const ExamplesIndex = () => {
  const navigate = useLocation()[1]

  return (
    <Box maxW="6xl" mx="auto" px={6} py={10}>
      <Heading variant="accent" mb={2}>
        Examples
      </Heading>
      <Text mb={3}>
        Focused, single-concept demos of <strong>json-edit-react</strong> — each shows a live editor
        and its source.
      </Text>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {Object.entries(examples).map(([slug, def]) => (
          <Box
            key={slug}
            as="button"
            textAlign="left"
            display="flex"
            flexDirection="column"
            cursor="pointer"
            onClick={() => navigate(`/examples/${slug}`)}
            p={3}
            borderRadius={10}
            backgroundColor="#f6f6f6"
            className="block-shadow"
            // Borderless at rest (like the Demo/Options panels); the accent
            // border appears on hover to signal these cards are clickable.
            border="1px solid transparent"
            transition="border-color 0.15s ease"
            _hover={{ borderColor: 'accent' }}
          >
            <Heading size="md" mb={1} variant="sub">
              {def.title}
            </Heading>
            {/* Clamp to 3 lines with a CSS ellipsis (`noOfLines` →
                `-webkit-line-clamp`) so the full markdown still renders —
                links/emphasis can't be cut mid-token — and every card keeps a
                uniform height. Paragraph breaks in the blurb are flattened to
                spaces first: `-webkit-line-clamp` only clamps reliably over a
                single block, and the card just wants a one-paragraph teaser
                (the full multi-paragraph blurb shows on the example page). */}
            <MarkdownText fontSize="sm" color="gray.600" mb={4} noOfLines={3}>
              {def.blurb.replace(/\s*\n+\s*/g, ' ')}
            </MarkdownText>
            {/* `mt="auto"` pushes the badge to the card's bottom so badges
                line up across the row; `alignSelf` keeps it at its natural
                width (the column stretches text full-width, but mustn't
                stretch the badge). The min gap above lives on the blurb's
                `mb`, not here — padding on a fixed-height image eats into the
                height under border-box. */}
            <Image
              src={kindBadge[def.kind].src}
              alt={kindBadge[def.kind].alt}
              mt="auto"
              alignSelf="flex-start"
              h="20px"
            />
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  )
}
