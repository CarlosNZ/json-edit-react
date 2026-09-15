/**
 * Collapse/expand logic for collection nodes, and the node's collapsed state.
 *
 * A CSS transition can't animate `height: auto`, which is what a collection
 * needs — the size of the inner nodes isn't known. `max-height` can be
 * transitioned instead, as long as the maximum exceeds the actual height:
 * https://dev.to/sarah_chima/using-css-transitions-on-the-height-property-al0
 *
 * The difficulty is choosing that `max-height`. Too small truncates the node's
 * contents; too large produces a noticeable lag while the unused height
 * collapses. Once a node has been opened its height can be queried from a ref;
 * before that it's estimated from the number of text lines the full content
 * would occupy, which is crude but adequate in nearly every case.
 *
 * The resulting logic:
 *
 * On first load:
 * - if closed, set max-height to 0
 * - if open, set no max-height (undefined) and let it resize automatically
 *
 * When collapsing an open node:
 * - store the current height in `prevHeight`
 * - set max-height to the current height
 * - immediately after, set max-height to 0, and the transition runs
 *
 * When opening a closed node:
 * - set max-height to the stored height if there is one, otherwise the estimate
 * - once the transition completes, unset `max-height` so the node can resize
 *   automatically with its contents
 */

import { useCallback, useRef, useState } from 'react'
import { type JsonData } from '../types'

export const useCollapseTransition = (
  data: JsonData,
  collapseAnimationTime: number,
  startCollapsed: boolean,
  mainContainerRef: React.MutableRefObject<Element>,
  jsonStringify: (
    data: JsonData,
    // eslint-disable-next-line
    replacer?: (this: any, key: string, value: unknown) => string
  ) => string
) => {
  const [maxHeight, setMaxHeight] = useState<string | number | undefined>(
    startCollapsed ? 0 : undefined
  )
  const [collapsed, setCollapsed] = useState<boolean>(startCollapsed)

  // Lets the collapsed node's overflow visibility and max-height wait for the
  // animation to complete
  const isAnimating = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const prevHeight = useRef<string | number>(0)
  const timerId = useRef<number>(0)

  const cssTransitionValue = `${collapseAnimationTime / 1000}s`

  // Change the collapse state, managing the animated transition
  const animateCollapse = useCallback(
    (collapse: boolean) => {
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
          setMaxHeight(
            prevHeight.current || estimateHeight(data, contentRef, mainContainerRef, jsonStringify)
          )
      }

      setCollapsed(!collapsed)
      timerId.current = window.setTimeout(() => {
        isAnimating.current = false
        if (!collapse) setMaxHeight(undefined)
      }, collapseAnimationTime)
    },
    [collapseAnimationTime, collapsed, data, mainContainerRef, jsonStringify]
  )

  return {
    contentRef,
    isAnimating: isAnimating.current,
    animateCollapse,
    maxHeight,
    collapsed,
    cssTransitionValue,
  }
}

// A crude estimate of a block's height before it has been opened: how many
// lines of text the full JSON would take up, converted to pixels via the
// current font size
const estimateHeight = (
  data: JsonData,
  contentRef: React.RefObject<HTMLDivElement | null>,
  containerRef: React.MutableRefObject<Element>,
  jsonStringify: (
    data: JsonData,
    // eslint-disable-next-line
    replacer?: (this: any, key: string, value: unknown) => string
  ) => string
) => {
  if (!contentRef.current) return 0

  // `|| 16` (not `??`) handles three jsdom/edge cases together: empty string
  // (jsdom returns `''` for unset computed styles, which `??` wouldn't catch),
  // `NaN` from `parseInt` on non-numeric values like `"normal"`, and `0`.
  const baseFontSize =
    parseInt(getComputedStyle(containerRef.current).getPropertyValue('line-height')) || 16

  const width = contentRef.current?.offsetWidth ?? 0
  const charsPerLine = width / (baseFontSize * 0.5)

  const lines = jsonStringify(data)
    // Turn line breaks escaped *within* the JSON into *actual* line breaks
    // before splitting
    .replace(/\\n/g, '\n')
    .split('\n')
    // Account for long lines being wrapped (very crudely)
    .map((line) => Math.ceil(line.length / charsPerLine))

  const totalLines = lines.reduce((sum, a) => sum + a, 0)
  const linesInPx = totalLines * baseFontSize

  return Math.min(linesInPx + 30, window.innerHeight - 50)
}
