import { useLocation } from 'wouter'
import { Box, Heading, SimpleGrid, Text } from '@chakra-ui/react'
import { examples } from './registry'

// Landing page listing every registered example. Data-driven from the registry,
// so a new entry shows up here automatically.
export const ExamplesIndex = () => {
  const navigate = useLocation()[1]

  return (
    <Box maxW="4xl" mx="auto" px={6} py={10}>
      <Heading mb={2}>Examples</Heading>
      <Text mb={6} color="gray.600">
        Focused, single-concept demos of <strong>json-edit-react</strong> — each shows a live
        editor and its source.
      </Text>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {Object.entries(examples).map(([slug, def]) => (
          <Box
            key={slug}
            as="button"
            textAlign="left"
            onClick={() => navigate(`/examples/${slug}`)}
            p={5}
            borderRadius="lg"
            borderWidth="1px"
            borderColor="gainsboro"
            bg="white"
            className="block-shadow"
            transition="border-color 0.15s ease"
            _hover={{ borderColor: 'accent' }}
          >
            <Heading size="md" mb={1}>
              {def.title}
            </Heading>
            <Text fontSize="sm" color="gray.600">
              {def.blurb}
            </Text>
            <Text fontSize="xs" mt={3} color="gray.400">
              {def.kind === 'live' ? '▶ Editable playground' : 'Live example'}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  )
}
