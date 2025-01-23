/**
 * Hook to handle the logic for collapsing and expanding collection nodes, and
 * holding the current collapsed state of a collection node
 *
 * The main problem we need to solve is that it's not possible to use a CSS
 * transition for `height` when it is set to `auto`, which it needs to be in
 * this case as we don't know the state or size of the inner nodes.
 *
 * We can, however, set a `max-height` and, as long as the maximum is larger
 * than the actual height, we can transition `max-height`, a technique which is
 * summarised here:
 * https://dev.to/sarah_chima/using-css-transitions-on-the-height-property-al0
 *
 * The difficulty is choosing an appropriate value for the `max-height` -- if
 * it's too small, the node contents gets truncated, but if it's too large,
 * there is a noticeable "lag" as the invisible "unused" part of the height is
 * collapsed. Just setting a really high value works, but the delay is annoying.
 *
 * So we can try and get the `max-height` from the height of the node itself.
 * This is easy once the node has been opened -- just query the element height
 * (using a ref). But if the node hasn't been opened, then we have to estimate
 * it. I'm doing this with fairly crude method based on the number of text lines
 * the full content of the node would take up. This is adequate in almost all
 * cases, although I'm open to refining this further.
 *
 * Basically, the logic is:
 *
 * On first load:
 * - if closed, set max-height to 0
 * - if open, set no max-height (undefined) and let it automatically resize
 *
 * When collapsing an open node:
 * - store the current height in "prevHeight"
 * - set the max-height to the current height
 * - immediately after, set max-height to 0 and transition will occur
 *
 * When opening a closed node:
 * - set max-height to the previously stored height if available; otherwise use
 *   the crudely calculated estimate.
 * - once transition is complete, unset `max-height` (undefined) so it can
 *   change height automatically based on its changing contents
 */

import { useRef, useState } from 'react'
import { type JsonData } from '../types'

export const useCollapseTransition = (
  data: JsonData,
  collapseAnimationTime: number,
  startCollapsed: boolean,
  mainContainerRef: React.MutableRefObject<Element>
) => {
  const [maxHeight, setMaxHeight] = useState<string | number | undefined>(
    startCollapsed ? 0 : undefined
  )
  const [collapsed, setCollapsed] = useState<boolean>(startCollapsed)

  // Allows us to wait for animation to complete before setting the overflow
  // visibility of the collapsed node, and the max-height
  const isAnimating = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const prevHeight = useRef<string | number>(0)
  const timerId = useRef<number>()

  // Method to change the collapse state and manage the animated transition
  const animateCollapse = (collapse: boolean) => {
    if (collapsed === collapse) return

    window.clearTimeout(timerId.current)
    isAnimating.current = true

    switch (collapse) {
      case true: {
        // Closing...
        const current = contentRef.current?.offsetHeight ?? 0
        prevHeight.current = current
        setMaxHeight(current)
        setTimeout(() => {
          setMaxHeight(0)
        }, 5)
        break
      }
      case false:
        // Opening...
        setMaxHeight(prevHeight.current || estimateHeight(data, contentRef, mainContainerRef))
    }

    setCollapsed(!collapsed)
    timerId.current = window.setTimeout(() => {
      isAnimating.current = false
      if (!collapse) setMaxHeight(undefined)
    }, collapseAnimationTime)
  }

  return {
    contentRef,
    isAnimating: isAnimating.current,
    animateCollapse,
    maxHeight,
    collapsed,
  }
}

// A crude measure to estimate the approximate height of the block before it has
// been opened. Essentially, it estimates how many lines of text the full JSON
// would take up, and converts that to a pixel value based on the current
// fontSize
const estimateHeight = (
  data: JsonData,
  contentRef: React.RefObject<HTMLDivElement>,
  containerRef: React.MutableRefObject<Element>
) => {
  const baseFontSize = parseInt(
    getComputedStyle(containerRef.current).getPropertyValue('line-height') ?? '16px'
  )

  const width = contentRef.current?.offsetWidth ?? 0
  const charsPerLine = width / (baseFontSize * 0.5)

  const lines = JSON.stringify(data, null, 2)
    // The Regexp replacement is to parse escaped line breaks
    // *within* the JSON into *actual* line breaks before splitting
    .replace(/\\n/g, '\n')
    .split('\n')
    // Account for long lines being wrapped (very crudely)
    .map((line) => Math.ceil(line.length / charsPerLine))

  const totalLines = lines.reduce((sum, a) => sum + a, 0)
  const linesInPx = totalLines * baseFontSize

  return Math.min(linesInPx + 30, window.innerHeight - 50)
}
