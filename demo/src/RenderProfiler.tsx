import React, { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Dev-only render profiler for the JsonEditor tree (V2 §16 perf work).
 *
 * Wraps its children in a `<React.Profiler>` and shows a small fixed overlay
 * with the aggregate cost of the wrapped subtree:
 *   - commits: how many times the tree committed since the last reset
 *   - last commit: actualDuration of the most recent commit (ms)
 *   - total: summed actualDuration across all commits (ms)
 *
 * Use it to answer "did this interaction cause one cheap commit or many
 * expensive ones?". For *which* nodes re-rendered, use the React DevTools
 * Profiler / "Highlight updates when components render" (per-node scope).
 *
 * Only active in dev (`pnpm dev`); in a production build it renders children
 * untouched, so it never appears on the deployed demo.
 *
 * IMPORTANT — why the structure is the way it is: `DevProfiler` holds NO state
 * of its own, so nothing *internal* drives a re-render of the `<Profiler>`
 * boundary. (It will still re-render if its parent does — that's normal React
 * and harmless — but the measurement apparatus never feeds back into the thing
 * it measures.) The polling readout lives entirely in the sibling `Overlay`
 * component, so its 250ms `setState` re-renders only the overlay box — never
 * the Profiler boundary or the editor. (An earlier version polled in this
 * component, which re-rendered the Profiler and made its own ticks count as
 * commits — the counter measured itself.)
 */

interface Stats {
  commits: number
  totalMs: number
  lastMs: number
}

const makeZero = (): Stats => ({ commits: 0, totalMs: 0, lastMs: 0 })

// Opt-in, dev only. Enable either by adding `?profiler` to the URL, or by
// setting `localStorage['jer-profiler'] = '1'` in the console. Reading these
// never touches the demo's own `?data=…` param; the localStorage flag also
// survives dataset switches (the dropdown rewrites the query string, which
// would drop `?profiler`). Re-evaluated on every render, so toggling is live.
const profilerEnabled = (): boolean => {
  if (!import.meta.env.DEV) return false
  try {
    return (
      new URLSearchParams(window.location.search).has('profiler') ||
      window.localStorage.getItem('jer-profiler') === '1'
    )
  } catch {
    return false
  }
}

export const RenderProfiler: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  profilerEnabled() ? <DevProfiler>{children}</DevProfiler> : <>{children}</>

const DevProfiler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Single source of truth for the accumulated stats. Mutated in `onRender`,
  // read on an interval by `Overlay`. Lives in a ref so updating it never
  // re-renders DevProfiler (which would churn the Profiler boundary).
  const statsRef = useRef<Stats>(makeZero())

  const onRender = useCallback<React.ProfilerOnRenderCallback>((_id, _phase, actualDuration) => {
    statsRef.current.commits += 1
    statsRef.current.totalMs += actualDuration
    statsRef.current.lastMs = actualDuration
  }, [])

  return (
    <>
      <React.Profiler id="tree" onRender={onRender}>
        {children}
      </React.Profiler>
      <Overlay statsRef={statsRef} />
    </>
  )
}

// Isolated readout. Polls the shared stats ref and re-renders ONLY itself.
const Overlay: React.FC<{ statsRef: React.RefObject<Stats> }> = ({ statsRef }) => {
  const [display, setDisplay] = useState<Stats>(makeZero)

  useEffect(() => {
    // Only re-render the overlay when the commit count actually moved, so an
    // idle tree leaves even the overlay still (no spurious "highlight updates"
    // flashing that could be mistaken for editor re-renders).
    const interval = setInterval(() => {
      setDisplay((prev) =>
        prev.commits === statsRef.current.commits ? prev : { ...statsRef.current }
      )
    }, 250)
    return () => clearInterval(interval)
  }, [statsRef])

  const reset = () => {
    statsRef.current = makeZero()
    setDisplay(makeZero())
  }

  return (
    <div style={overlayStyle}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>⚡ Render Profiler</div>
      <div style={rowStyle}>
        <span>Commits</span>
        <span>{display.commits}</span>
      </div>
      <div style={rowStyle}>
        <span>Last commit</span>
        <span>{display.lastMs.toFixed(2)} ms</span>
      </div>
      <div style={rowStyle}>
        <span>Total</span>
        <span>{display.totalMs.toFixed(1)} ms</span>
      </div>
      <button onClick={reset} style={buttonStyle}>
        Reset
      </button>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 12,
  right: 12,
  zIndex: 9999,
  width: 190,
  padding: '10px 12px',
  background: 'rgba(20, 20, 28, 0.92)',
  color: '#e8e8f0',
  font: '12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace',
  borderRadius: 8,
  boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
  pointerEvents: 'auto',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
}

const buttonStyle: React.CSSProperties = {
  marginTop: 8,
  width: '100%',
  padding: '3px 0',
  background: '#3a3a4a',
  color: '#e8e8f0',
  border: '1px solid #55556a',
  borderRadius: 5,
  cursor: 'pointer',
}
