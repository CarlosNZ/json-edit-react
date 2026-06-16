import { useMemo, useState, type CSSProperties } from 'react'
import {
  Box,
  Button,
  Code,
  Flex,
  FormLabel,
  Heading,
  Input,
  Select,
  Switch,
  Text,
  Wrap,
  WrapItem,
} from '@chakra-ui/react'
import { JsonEditor, type JsonData, type NodeData, type ThemeStyles } from '@json-edit-react'
import { type FilterPredicate } from '@json-edit-react/utils'
import { useExampleProps, useExampleTheme } from '../kit/exampleProps'
import { useExamplePalette } from '../kit/useThemePalette'
import { SplitPane } from '../kit/SplitPane'
import { orgData } from './data'
import { RECIPES, RECIPE_GROUPS, SEARCH_STRATEGIES } from './recipes'

// The match highlight. A translucent amber reads on both light and dark themes,
// and the rounded corners make a tinted key/value look like a pill.
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

export default function FilterToolkit() {
  const exampleProps = useExampleProps()
  const baseTheme = useExampleTheme()
  const palette = useExamplePalette()

  const [data, setData] = useState<JsonData>(orgData)
  const [recipeId, setRecipeId] = useState('numbers')
  const [lockNonMatching, setLockNonMatching] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [searchId, setSearchId] = useState('value')

  const activeRecipe = RECIPES.find((r) => r.id === recipeId) ?? RECIPES[0]
  const activeSearch = SEARCH_STRATEGIES.find((s) => s.id === searchId) ?? SEARCH_STRATEGIES[0]

  // Recompose only when the base theme or the active recipe changes. The
  // recipe's predicate is interned (a stable reference per recipe), so this
  // doesn't churn between unrelated renders.
  const theme = useMemo(
    () => [baseTheme, buildHighlightTheme(activeRecipe.predicate)],
    [baseTheme, activeRecipe]
  )

  return (
    <SplitPane
      storageId="filter-toolkit"
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
            allowEdit={lockNonMatching ? activeRecipe.predicate : undefined}
          />
        </Box>
      }
      right={
        <Flex direction="column" gap={4}>
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
              the highlight.
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
                  {RECIPES.filter((r) => r.group === group).map((r) => (
                    <WrapItem key={r.id}>
                      <Button
                        size="xs"
                        variant={r.id === recipeId ? 'solid' : 'outline'}
                        colorScheme={r.id === recipeId ? 'yellow' : 'gray'}
                        onClick={() => setRecipeId(r.id)}
                      >
                        {r.label}
                      </Button>
                    </WrapItem>
                  ))}
                </Wrap>
              </Box>
            ))}

            <Code
              display="block"
              whiteSpace="pre-wrap"
              wordBreak="break-word"
              p={3}
              mt={4}
              borderRadius="md"
              fontSize="sm"
            >
              {activeRecipe.code}
            </Code>
            <Text fontSize="sm" mt={2} color={palette.string}>
              {activeRecipe.description}
            </Text>

            <Flex align="center" mt={4} gap={2}>
              <Switch
                id="lock-edit"
                isChecked={lockNonMatching}
                onChange={(e) => setLockNonMatching(e.target.checked)}
              />
              <FormLabel htmlFor="lock-edit" m={0} fontSize="sm" color={palette.property}>
                Also bind it to <Code fontSize="xs">allowEdit</Code> — lock non-matching nodes
              </FormLabel>
            </Flex>
            <Text fontSize="xs" mt={1} opacity={0.85} color={palette.string}>
              {lockNonMatching
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
            <Input
              mt={3}
              size="sm"
              bg="white"
              color="gray.800"
              placeholder="Search the tree…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Select
              mt={2}
              size="sm"
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
            <Code
              display="block"
              whiteSpace="pre-wrap"
              wordBreak="break-word"
              p={3}
              mt={3}
              borderRadius="md"
              fontSize="sm"
            >
              {activeSearch.code}
            </Code>
            <Text fontSize="sm" mt={2} color={palette.string}>
              {activeSearch.description}
            </Text>
          </Box>
        </Flex>
      }
    />
  )
}
