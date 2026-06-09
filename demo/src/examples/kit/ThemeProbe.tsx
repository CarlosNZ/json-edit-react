import { forwardRef } from 'react'
import { Box } from '@chakra-ui/react'
import { JsonEditor, type Theme } from '@json-edit-react'

// Fixed data covering every theme element the palette reads: an object key, a
// string value, and a (counted) collection holding a number value.
const PROBE_DATA = { key: 'value', list: [1] }
const noop = () => {}

// A visually-hidden, fully-expanded editor rendered solely so `useThemePalette`
// can read every theme element colour (key / string / count) regardless of the
// visible example's data or collapse state — e.g. a `collapse`d example may
// show no string values at all. Hidden off-screen but still rendered, so its
// computed styles resolve.
export const ThemeProbe = forwardRef<HTMLDivElement, { theme: Theme }>(function ThemeProbe(
  { theme },
  ref
) {
  return (
    <Box
      ref={ref}
      aria-hidden
      position="absolute"
      left="-9999px"
      top={0}
      w="1px"
      h="1px"
      overflow="hidden"
      opacity={0}
      pointerEvents="none"
    >
      {/* collapseAnimationTime={0}: the editor transitions the item-count
          colour over the collapse animation; without this, a theme switch can
          be sampled mid-transition (a wrong/old colour). */}
      <JsonEditor
        data={PROBE_DATA}
        setData={noop}
        theme={theme}
        collapse={false}
        showCollectionCount
        collapseAnimationTime={0}
      />
    </Box>
  )
})
