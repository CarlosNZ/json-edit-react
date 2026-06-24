import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Box, useBreakpointValue } from '@chakra-ui/react'
import { useExamplePalette } from './useThemePalette'

const DEFAULT_BAND_PX = 1080 // editor+code start centred at the header's width
const MIN_PANE_PX = 280 // minimum width of the editor or code pane
const HANDLE_PX = 16 // width of each drag-handle column
const HALF = HANDLE_PX / 2
const KEY_STEP_PX = 24 // arrow-key nudge per press
// Per-page localStorage key — each example remembers its own layout, so a
// layout that suits a wide-key example doesn't carry over to a narrow one.
const STORAGE_KEY_PREFIX = 'jer-examples-split'
const storageKeyFor = (id: string) => `${STORAGE_KEY_PREFIX}:${id}`

type Edge = 'x1' | 'x2' | 'x3'

// Boundary positions, as px from the container's left edge (each is a handle's
// centre):
//   x1 — left margin │ editor
//   x2 — editor │ code (the centre divider)
//   x3 — code │ right margin
// Everything outside [x1, x3] is empty margin the band can be dragged out into.
interface Bounds {
  x1: number
  x2: number
  x3: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

// Force a set of boundaries to be ordered, within the track, and each pane at
// least MIN_PANE_PX wide (used after a resize or when restoring a saved
// layout).
const clampBounds = ({ x1, x2, x3 }: Bounds, width: number): Bounds => {
  x1 = clamp(x1, HALF, width)
  x2 = clamp(x2, x1 + MIN_PANE_PX + HANDLE_PX, width)
  x3 = clamp(x3, x2 + MIN_PANE_PX + HANDLE_PX, width - HALF)
  x2 = Math.min(x2, x3 - MIN_PANE_PX - HANDLE_PX)
  x1 = clamp(x1, HALF, x2 - MIN_PANE_PX - HANDLE_PX)
  return { x1, x2, x3 }
}

// Centre an 1080-wide band (or the full width, if narrower) and split it 50/50.
const defaultBounds = (width: number): Bounds => {
  const band = Math.min(DEFAULT_BAND_PX, width)
  const margin = Math.max((width - band) / 2, HALF)
  return { x1: margin, x2: width / 2, x3: width - margin }
}

// Persistence is stored as fractions of the container width so it restores
// correctly at any window size or on any page (all share PANE_MAX_WIDTH).
type Fractions = [number, number, number]

const loadFractions = (key: string): Fractions | null => {
  try {
    const f = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (
      Array.isArray(f) &&
      f.length === 3 &&
      f.every((n) => typeof n === 'number' && n >= 0 && n <= 1) &&
      f[0] <= f[1] &&
      f[1] <= f[2]
    )
      return f as Fractions
  } catch {
    // Malformed or unavailable storage — fall back to the default layout.
  }
  return null
}

const saveFractions = (key: string, { x1, x2, x3 }: Bounds, width: number) => {
  if (!width) return
  try {
    localStorage.setItem(key, JSON.stringify([x1 / width, x2 / width, x3 / width]))
  } catch {
    // Storage unavailable (private mode, quota) — persistence is best-effort.
  }
}

interface SplitPaneProps {
  left: ReactNode
  right: ReactNode
  // Identifies the page so each example persists its own layout (usually the
  // example slug). Required — different examples have different ideal splits.
  storageId: string
  // Opt-in: keep the right pane pinned in view (position: sticky) as the page
  // scrolls past a tall left pane. No effect in the stacked (narrow) layout.
  //  - `true`  — sticky positioning only; the pane sizes itself (e.g. a code
  //    block that caps its own height and scrolls its body).
  //  - `'scroll'` — also cap the pane at the viewport and scroll it internally
  //    when it's taller. For "dumb" content like a control panel that won't
  //    size itself. (Such content must portal any popovers so this pane's
  //    overflow doesn't clip them.)
  stickyRight?: boolean | 'scroll'
}

// When stickyRight is set, the pinned pane sits this far below the viewport top
// (a small gap, since the page has no fixed header to clear).
const STICKY_TOP_PX = 16

// Two resizable panes inside a wider track. By default the band is centred at
// the header's width with empty margins either side. Three handles — the band's
// left edge, the centre divider, and its right edge — let the user trade width
// between the panes or pull the whole band out into the margins (e.g. widen the
// code to reduce wrapping). The chosen layout persists across pages and visits.
// Below `lg` the panes stack and the handles disappear (no room to split). The
// grip colour is read from the example palette so it reads on any theme.
export const SplitPane = ({ left, right, storageId, stickyRight = false }: SplitPaneProps) => {
  const palette = useExamplePalette()
  const color = palette.itemCount ?? 'gray.400'
  const storageKey = storageKeyFor(storageId)

  // `ssr: false` reads matchMedia on mount (client-only Vite app), so wide
  // screens don't flash the stacked layout before flipping to side-by-side.
  const horizontal = useBreakpointValue({ base: false, lg: true }, { ssr: false }) ?? false
  const containerRef = useRef<HTMLDivElement>(null)
  const widthRef = useRef(0)
  const [bounds, setBounds] = useState<Bounds | null>(null)
  const [dragging, setDragging] = useState(false)
  // True once the user has set a layout (dragged, or restored from storage), so
  // we stop auto-recentring the band on container resize.
  const touched = useRef(false)

  // Seed before first paint (so we never flash an unpositioned band): restore a
  // saved layout if there is one, otherwise centre the default band.
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!horizontal || !el || bounds) return
    const w = el.clientWidth
    widthRef.current = w
    const saved = loadFractions(storageKey)
    if (saved) {
      touched.current = true
      setBounds(clampBounds({ x1: saved[0] * w, x2: saved[1] * w, x3: saved[2] * w }, w))
    } else {
      setBounds(defaultBounds(w))
    }
  }, [horizontal, bounds, storageKey])

  // On container resize: re-centre until the user has set a layout, then scale
  // the band proportionally (so it keeps its place) and clamp it back to valid.
  useEffect(() => {
    const el = containerRef.current
    if (!el || !horizontal) return
    const ro = new ResizeObserver(() => {
      const newW = el.clientWidth
      const oldW = widthRef.current || newW
      widthRef.current = newW
      setBounds((prev) => {
        if (!prev) return prev
        if (!touched.current) return defaultBounds(newW)
        const k = oldW ? newW / oldW : 1
        return clampBounds({ x1: prev.x1 * k, x2: prev.x2 * k, x3: prev.x3 * k }, newW)
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [horizontal])

  // Persist the layout once the user has set one (skip mid-drag writes).
  useEffect(() => {
    if (bounds && !dragging && touched.current) saveFractions(storageKey, bounds, widthRef.current)
  }, [storageKey, bounds, dragging])

  const setEdge = useCallback((edge: Edge, value: number | ((cur: number) => number)) => {
    touched.current = true
    setBounds((prev) => {
      if (!prev) return prev
      const width = widthRef.current
      const v = typeof value === 'function' ? value(prev[edge]) : value
      if (edge === 'x1') return { ...prev, x1: clamp(v, HALF, prev.x2 - MIN_PANE_PX - HANDLE_PX) }
      if (edge === 'x2')
        return {
          ...prev,
          x2: clamp(v, prev.x1 + MIN_PANE_PX + HANDLE_PX, prev.x3 - MIN_PANE_PX - HANDLE_PX),
        }
      return { ...prev, x3: clamp(v, prev.x2 + MIN_PANE_PX + HANDLE_PX, width - HALF) }
    })
  }, [])

  const handle = (edge: Edge, label: string) => (
    <Box
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      tabIndex={0}
      flex={`0 0 ${HANDLE_PX}px`}
      alignSelf="stretch"
      display="flex"
      alignItems="center"
      justifyContent="center"
      cursor="col-resize"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragging(true)
      }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) setEdge(edge, e.clientX - rect.left)
      }}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId)
        setDragging(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          setEdge(edge, (c) => c - KEY_STEP_PX)
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          setEdge(edge, (c) => c + KEY_STEP_PX)
        }
      }}
      sx={{
        // Invisible at rest; the grip fades in only when the handle is hovered
        // or keyboard-focused, so handles don't float in the margin (e.g.
        // alongside a short editor block).
        '&::before': {
          content: '""',
          width: '3px',
          height: '2.5em',
          borderRadius: 'full',
          background: color,
          opacity: 0,
          transition: 'opacity 0.15s ease',
        },
        '&:hover::before, &:focus-visible::before': { opacity: 0.9 },
      }}
    />
  )

  // Stacked: full-width panes, no handles.
  if (!horizontal)
    return (
      <Box display="flex" flexDir="column" gap={4}>
        {left}
        {right}
      </Box>
    )

  // First horizontal paint, before the seed effect runs: render an empty
  // full-width box just to measure the container, hidden so it isn't seen.
  if (!bounds) return <Box ref={containerRef} visibility="hidden" minH="1px" />

  const { x1, x2, x3 } = bounds
  const leftMargin = Math.max(0, x1 - HALF)
  const editorW = Math.max(0, x2 - x1 - HANDLE_PX)
  const codeW = Math.max(0, x3 - x2 - HANDLE_PX)

  return (
    <Box
      ref={containerRef}
      display="flex"
      alignItems="flex-start"
      // Suppress text selection while dragging so a drag doesn't highlight
      // panes.
      userSelect={dragging ? 'none' : undefined}
    >
      <Box flex={`0 0 ${leftMargin}px`} aria-hidden />
      {handle('x1', 'Resize left edge')}
      <Box flex={`0 0 ${editorW}px`} minW={0}>
        {left}
      </Box>
      {handle('x2', 'Resize editor and code')}
      <Box
        flex={`0 0 ${codeW}px`}
        minW={0}
        // Stretch the column to the full row height (matching a tall left pane)
        // so the sticky child has room to travel; otherwise hug the content.
        alignSelf={stickyRight ? 'stretch' : undefined}
      >
        {stickyRight ? (
          <Box
            position="sticky"
            top={`${STICKY_TOP_PX}px`}
            // 'scroll' panes cap at the viewport and scroll their own overflow;
            // `true` panes size themselves, so leave them unconstrained.
            {...(stickyRight === 'scroll'
              ? { maxH: `calc(100vh - ${2 * STICKY_TOP_PX}px)`, overflowY: 'auto' }
              : {})}
          >
            {right}
          </Box>
        ) : (
          right
        )}
      </Box>
      {handle('x3', 'Resize right edge')}
      <Box flex="1 1 0" aria-hidden />
    </Box>
  )
}
