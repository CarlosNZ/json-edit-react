import { type CSSProperties } from 'react'
import { type ThemePalette, type Toast, type ToastStatus } from '@example-resources'

// "profile.displayName" → ['profile', 'displayName']; numeric segments (array
// indices) become numbers; blank → [] (root).
export const parsePath = (input: string): (string | number)[] =>
  input
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (/^\d+$/.test(s) ? Number(s) : s))

export const label = (path: (string | number)[]) => (path.length ? path.join(' › ') : '(root)')

// Walk `data` to the value at `path` (undefined if any step is missing). Used
// to check whether a collapse target is actually a collection before acting.
export const valueAtPath = (data: unknown, path: (string | number)[]): unknown =>
  path.reduce<unknown>(
    (node, key) =>
      node !== null && typeof node === 'object'
        ? (node as Record<string | number, unknown>)[key]
        : undefined,
    data
  )

// Bind the demo's toast notifier into a one-liner for the imperative actions'
// feedback — a fixed position / duration / style, varying only title + status.
export const createNotify =
  (toast: Toast) => (title: string, status: ToastStatus, description?: string) =>
    toast({
      title,
      description,
      status,
      duration: 2500,
      isClosable: true,
      position: 'top-right',
      variant: 'left-accent',
    })

// All the example's styling. The panel matches the header + editor cards (the
// editor's background + a theme text colour); the controls use a faint neutral
// surface + border so they stay legible on any theme, with theme-coloured text
// and accents. Panel and editor each get their own drop-shadow (this example
// opts out of the shell's single shadow box via `selfChrome`).
const SHADOW = 'rgba(0, 0, 0, 0.24) 0px 3px 8px'
const SURFACE = 'rgba(127, 127, 127, 0.12)'
const BORDER = '1px solid rgba(127, 127, 127, 0.4)'

export const styles = (palette: ThemePalette) => {
  const panel: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6em',
    padding: '0.9em',
    marginBottom: '1em',
    borderRadius: 8,
    boxShadow: SHADOW,
    color: palette.string,
    ...palette.headerBg,
  }
  const editorBox: CSSProperties = { borderRadius: 6, boxShadow: SHADOW }
  const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.5em' }
  const confirmGroup: CSSProperties = { marginLeft: 'auto', display: 'flex', gap: '0.5em' }
  const input: CSSProperties = {
    padding: '0.4em 0.6em',
    fontSize: '0.95em',
    fontFamily: 'monospace',
    color: 'inherit',
    background: SURFACE,
    border: BORDER,
    borderRadius: 6,
  }
  const button: CSSProperties = {
    padding: '0.4em 0.9em',
    fontSize: '0.9em',
    color: palette.property,
    background: SURFACE,
    border: BORDER,
    borderRadius: 6,
    cursor: 'pointer',
  }
  const check: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4em',
    fontSize: '0.9em',
    cursor: 'pointer',
  }
  const checkbox: CSSProperties = { accentColor: palette.property }
  return { panel, editorBox, row, confirmGroup, input, button, check, checkbox }
}
