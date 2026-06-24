import { useMemo, useState, type CSSProperties } from 'react'
import {
  Box,
  type BoxProps,
  Button,
  Code,
  Flex,
  type FlexProps,
  FormLabel,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Select,
  Switch,
  Text,
  Wrap,
  WrapItem,
} from '@chakra-ui/react'
import { InfoIcon, SmallCloseIcon } from '@chakra-ui/icons'
import { JsonEditor, type JsonData, type NodeData, type ThemeStyles } from '@json-edit-react'
import { type FilterPredicate } from '@json-edit-react/utils/filters'
import { useExampleProps, useExampleTheme } from '../kit/exampleProps'
import { useExamplePalette } from '../kit/useThemePalette'
import { SplitPane } from '../kit/SplitPane'
import { MarkdownText } from '../kit/MarkdownText'
import { orgData } from './data'
import { RECIPES, RECIPE_GROUPS, SEARCH_STRATEGIES } from './recipes'

// The match highlight and the active-chip accent share one amber, so the
// selected builder visually ties to what's lit up in the tree. It's bright
// enough to read on both light and dark themes.
const ACCENT = '#FFB300'
const HIGHLIGHT: CSSProperties = {
  backgroundColor: 'rgba(255, 196, 0, 0.5)',
  borderRadius: '0.2em',
}

// Turn a predicate into a theme layer that paints every node it matches. The
// whole trick of this example: a `FilterPredicate` is `(node) => boolean` and a
// theme style function is `(node) => CSSProperties`, so the predicate drops
// straight in. We tint both the key (`property`) and the value of a matched
// node — plus the brackets — so collection and leaf matches both read clearly.
const buildHighlightTheme = (match: FilterPredicate): ThemeStyles => {
  const paint = (nodeData: NodeData): CSSProperties | undefined =>
    match(nodeData) ? HIGHLIGHT : undefined
  return {
    property: paint,
    string: paint,
    number: paint,
    boolean: paint,
    null: paint,
    bracket: paint,
  }
}

// The builder expression, with a "Show long-hand" button floated over its
// top-right that pops the equivalent hand-written filter for comparison. Shared
// by both the highlight recipes and the search bridges.
const FilterCode = ({ code, longhand, ...rest }: { code: string; longhand: string } & BoxProps) => (
  <Box position="relative" {...rest}>
    <Popover placement="bottom-end" isLazy>
      <PopoverTrigger>
        <Button
          size="xs"
          position="absolute"
          top={2}
          right={2}
          zIndex={1}
          bg="white"
          color="gray.700"
          borderWidth="1px"
          borderColor="gray.300"
          boxShadow="sm"
          _hover={{ borderColor: ACCENT, color: 'gray.900' }}
        >
          Without the kit
        </Button>
      </PopoverTrigger>
      <PopoverContent w="auto" maxW="min(92vw, 460px)">
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader fontWeight="bold" fontSize="sm">
          Without the kit
        </PopoverHeader>
        <PopoverBody>
          <Text fontSize="xs" mb={2} color="gray.600">
            What you'd write instead:
          </Text>
          <Code
            display="block"
            whiteSpace="pre-wrap"
            wordBreak="break-word"
            p={3}
            borderRadius="md"
            fontSize="sm"
          >
            {longhand}
          </Code>
        </PopoverBody>
      </PopoverContent>
    </Popover>
    <Code
      display="block"
      whiteSpace="pre-wrap"
      wordBreak="break-word"
      p={3}
      pr={28}
      borderRadius="md"
      fontSize="sm"
    >
      {code}
    </Code>
  </Box>
)

// An "info box" for a builder's plain-language description. A soft amber
// callout — the example's own accent — with a left bar and a filled info glyph,
// so it reads as a distinct "note" rather than another (neutral) code surface,
// while staying a fixed light surface that's legible on any editor theme. Prose
// is Markdown, so inline `code` renders.
const InfoBox = ({ children, ...rest }: { children: string } & FlexProps) => (
  <Flex
    gap={3}
    align="flex-start"
    bg="#FFF8E1"
    borderInlineStartWidth="4px"
    borderInlineStartColor={ACCENT}
    borderRadius="md"
    p={3}
    {...rest}
  >
    <InfoIcon mt="0.15em" boxSize="1.15em" color="#B7791F" flexShrink={0} />
    <MarkdownText fontSize="md" color="gray.800">
      {children}
    </MarkdownText>
  </Flex>
)

export default function FilterToolkit() {
  const exampleProps = useExampleProps()
  const baseTheme = useExampleTheme()
  const palette = useExamplePalette()

  const [data, setData] = useState<JsonData>(orgData)
  // `null` = nothing selected (no highlight). Clicking the active chip toggles
  // back to this.
  const [recipeId, setRecipeId] = useState<string | null>('numbers')
  const [lockNonMatching, setLockNonMatching] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [searchId, setSearchId] = useState('value')

  const activeRecipe = RECIPES.find((r) => r.id === recipeId) ?? null
  const activeSearch = SEARCH_STRATEGIES.find((s) => s.id === searchId) ?? SEARCH_STRATEGIES[0]

  // Compose the highlight layer over the picked theme — or just the theme when
  // nothing's selected. The predicate is interned (stable per recipe), so this
  // only recomputes when the base theme or active recipe actually changes.
  const theme = useMemo(
    () => (activeRecipe ? [baseTheme, buildHighlightTheme(activeRecipe.predicate)] : baseTheme),
    [baseTheme, activeRecipe]
  )

  // Chips borrow the editor theme's own colours (via the palette) so they stay
  // legible on any theme; the active chip is the amber accent.
  const chipProps = (isActive: boolean) =>
    ({
      size: 'xs',
      variant: 'outline',
      fontWeight: isActive ? 'bold' : 'normal',
      bg: isActive ? ACCENT : 'transparent',
      color: isActive ? 'gray.900' : (palette.property ?? 'inherit'),
      borderColor: isActive ? ACCENT : (palette.itemCount ?? palette.property ?? 'currentColor'),
      _hover: { borderColor: ACCENT, color: isActive ? 'gray.900' : ACCENT },
    }) as const

  return (
    <SplitPane
      storageId="filter-toolkit"
      // The control panel stays pinned while you scroll the (tall) tree.
      stickyRight
      left={
        <Box className="block-shadow" borderRadius="md">
          <JsonEditor
            data={data}
            setData={setData}
            {...exampleProps}
            theme={theme}
            rootName="company"
            // Fully expanded (the default) so the highlighting reads across the
            // whole tree from the start. Search finds deep matches either way —
            // a match's collapsed ancestors stay visible with their filtered
            // counts — it just doesn't auto-open them.
            searchText={searchText}
            // Only filter once there's something to search for; an empty box
            // leaves the whole tree visible.
            searchFilter={searchText ? activeSearch.filter : undefined}
            // Bind the active predicate to allowEdit when the toggle is on.
            allowEdit={lockNonMatching && activeRecipe ? activeRecipe.predicate : undefined}
            collapse={false}
          />
        </Box>
      }
      right={
        // `zoom` scales the whole control panel — text, badges, icons, spacing
        // — up 10%; percentages still resolve against the zoomed box, so it
        // reflows within the pane rather than overflowing.
        <Flex direction="column" gap={4} sx={{ zoom: 1.1 }}>
          {/* Section 1 — highlight matches (+ optional allowEdit binding). */}
          <Box
            borderRadius="lg"
            className="block-shadow"
            p={4}
            transition="background 0.4s ease"
            style={palette.headerBg}
          >
            <Heading size="sm" color={palette.property}>
              Highlight matches
            </Heading>
            <Text fontSize="sm" mt={1} color={palette.string}>
              Pick a builder — every node it matches lights up in the tree. A predicate is just{' '}
              <Code fontSize="xs">{'(node) => boolean'}</Code>, and a theme style function is{' '}
              <Code fontSize="xs">{'(node) => CSSProperties'}</Code>, so the same function drives
              the highlight. Click the active chip again to clear it.
            </Text>

            {RECIPE_GROUPS.map((group) => (
              <Box key={group} mt={3}>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  opacity={0.85}
                  color={palette.itemCount}
                >
                  {group}
                </Text>
                <Wrap spacing={2} mt={1.5}>
                  {RECIPES.filter((r) => r.group === group).map((r) => {
                    const isActive = r.id === recipeId
                    return (
                      <WrapItem key={r.id}>
                        <Button
                          {...chipProps(isActive)}
                          onClick={() => setRecipeId(isActive ? null : r.id)}
                        >
                          {r.label}
                        </Button>
                      </WrapItem>
                    )
                  })}
                </Wrap>
              </Box>
            ))}

            {activeRecipe ? (
              <Box mt={4}>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  opacity={0.85}
                  color={palette.itemCount}
                >
                  Filter function
                </Text>
                <Text fontSize="sm" color={palette.string} mt={1} mb={2}>
                  The predicate you'd hand to a filter prop like{' '}
                  <Code fontSize="xs">allowEdit</Code> or <Code fontSize="xs">searchFilter</Code> —
                  the same <Code fontSize="xs">{'(node) => boolean'}</Code>. Here it drives the
                  highlight (and <Code fontSize="xs">allowEdit</Code>, with the toggle below).
                </Text>
                <FilterCode code={activeRecipe.code} longhand={activeRecipe.longhand} />
                <InfoBox mt={3}>{activeRecipe.description}</InfoBox>
              </Box>
            ) : (
              <Text mt={4} fontSize="sm" fontStyle="italic" opacity={0.8} color={palette.string}>
                Nothing highlighted — pick a builder above to see its filter function.
              </Text>
            )}

            <Flex align="center" mt={4} gap={2}>
              <Switch
                id="lock-edit"
                isChecked={lockNonMatching}
                isDisabled={!activeRecipe}
                onChange={(e) => setLockNonMatching(e.target.checked)}
              />
              <FormLabel htmlFor="lock-edit" m={0} fontSize="sm" color={palette.property}>
                Also bind it to <Code fontSize="xs">allowEdit</Code> — lock non-matching nodes
              </FormLabel>
            </Flex>
            <Text fontSize="xs" mt={1} opacity={0.85} color={palette.string}>
              {lockNonMatching && activeRecipe
                ? 'Double-click a value to try — edits are blocked on non-highlighted nodes. (allowEdit governs value editing, so leaf-targeting recipes show it best.)'
                : 'Off — every node is editable, as usual.'}
            </Text>
          </Box>

          {/* Section 2 — search bridges. */}
          <Box
            borderRadius="lg"
            className="block-shadow"
            p={4}
            transition="background 0.4s ease"
            style={palette.headerBg}
          >
            <Heading size="sm" color={palette.property}>
              Search bridges
            </Heading>
            <Text fontSize="sm" mt={1} color={palette.string}>
              These turn the live search into a <Code fontSize="xs">searchFilter</Code>. Type a
              query, then switch strategy to compare how each one reveals matches.
            </Text>
            <InputGroup mt={3} size="md">
              <Input
                bg="white"
                color="gray.800"
                placeholder="Search the tree…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              {searchText && (
                <InputRightElement>
                  <IconButton
                    aria-label="Clear search"
                    icon={<SmallCloseIcon />}
                    size="sm"
                    variant="ghost"
                    color="gray.600"
                    _hover={{ color: 'gray.900', bg: 'blackAlpha.100' }}
                    onClick={() => setSearchText('')}
                  />
                </InputRightElement>
              )}
            </InputGroup>
            <Select
              mt={2}
              size="md"
              bg="white"
              color="gray.800"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            >
              {SEARCH_STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
            <FilterCode code={activeSearch.code} longhand={activeSearch.longhand} mt={3} />
            <InfoBox mt={3}>{activeSearch.description}</InfoBox>
          </Box>
        </Flex>
      }
    />
  )
}
