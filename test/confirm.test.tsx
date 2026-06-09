import { act, renderHook } from '@testing-library/react'
import type { JsonData, UpdateFunctionProps } from '../src'
import { useConfirmOnUpdate, useJsonEditorConfirm } from '../packages/utils/src'

// Minimal synthetic update input. The discriminated union's per-event extras
// (newValue / newKey / newPath) are irrelevant to the gating logic, so a cast
// keeps the helper terse.
const makeInput = (
  event: UpdateFunctionProps['event'],
  overrides: Partial<UpdateFunctionProps> = {}
): UpdateFunctionProps =>
  ({
    key: 'foo',
    path: ['foo'],
    level: 1,
    index: 0,
    value: 'bar',
    size: null,
    parentData: {},
    fullData: {},
    newData: {},
    event,
    ...overrides,
  }) as UpdateFunctionProps

// A fake `UpdateControl` that tracks the `hold()` → `release()` gate the hook
// drives. `hold()` returns the spy `release`, so a test can assert the gate was
// opened (held) and whether it was released (confirm) or not (cancel).
const makeControl = () => {
  const release = jest.fn()
  const hold = jest.fn(() => release)
  return { control: { hold }, hold, release }
}

describe('useJsonEditorConfirm (Layer 1)', () => {
  it('opens the dialog with the supplied request and resolves true on confirm', async () => {
    const { result } = renderHook(() => useJsonEditorConfirm())

    expect(result.current.dialog.isOpen).toBe(false)

    let pending!: Promise<boolean>
    act(() => {
      pending = result.current.confirm({ title: 'Delete?', message: 'Really delete "foo"?' })
    })

    expect(result.current.dialog.isOpen).toBe(true)
    expect(result.current.dialog.title).toBe('Delete?')
    expect(result.current.dialog.message).toBe('Really delete "foo"?')

    act(() => result.current.dialog.onConfirm())

    await expect(pending).resolves.toBe(true)
    expect(result.current.dialog.isOpen).toBe(false)
  })

  it('resolves false on cancel', async () => {
    const { result } = renderHook(() => useJsonEditorConfirm())

    let pending!: Promise<boolean>
    act(() => {
      pending = result.current.confirm()
    })

    act(() => result.current.dialog.onCancel())

    await expect(pending).resolves.toBe(false)
    expect(result.current.dialog.isOpen).toBe(false)
  })

  it('carries opaque extra payload through to the dialog state', () => {
    const { result } = renderHook(() => useJsonEditorConfirm())

    act(() => {
      void result.current.confirm({ message: 'x', severity: 'danger', count: 3 })
    })

    expect(result.current.dialog.severity).toBe('danger')
    expect(result.current.dialog.count).toBe(3)
  })

  it('supersedes a still-open prompt, cancelling the first (single-dialog model)', async () => {
    const { result } = renderHook(() => useJsonEditorConfirm())

    let first!: Promise<boolean>
    let second!: Promise<boolean>
    act(() => {
      first = result.current.confirm({ title: 'first' })
    })
    act(() => {
      second = result.current.confirm({ title: 'second' })
    })

    await expect(first).resolves.toBe(false)
    expect(result.current.dialog.title).toBe('second')

    act(() => result.current.dialog.onConfirm())
    await expect(second).resolves.toBe(true)
  })

  it('resolves a pending promise as false on unmount (no hanging await)', async () => {
    const { result, unmount } = renderHook(() => useJsonEditorConfirm())

    let pending!: Promise<boolean>
    act(() => {
      pending = result.current.confirm()
    })

    unmount()

    await expect(pending).resolves.toBe(false)
  })
})

describe('useConfirmOnUpdate (Layer 2)', () => {
  it('holds the gate and returns null when the user cancels a gated event', async () => {
    const { result } = renderHook(() =>
      useConfirmOnUpdate<JsonData>({ confirmOn: ['delete'], message: 'sure?' })
    )
    const { control, hold, release } = makeControl()

    let res!: Promise<unknown>
    act(() => {
      res = Promise.resolve(result.current.onUpdate(makeInput('delete'), control))
    })

    // hold() ran synchronously to open the gate (editor stays open, tree blocked).
    expect(hold).toHaveBeenCalledTimes(1)
    expect(result.current.dialog.isOpen).toBe(true)
    expect(result.current.dialog.message).toBe('sure?')

    act(() => result.current.dialog.onCancel())

    await act(async () => {
      await expect(res).resolves.toBeNull()
    })
    // Cancelled → the gate was never released, so nothing was applied.
    expect(release).not.toHaveBeenCalled()
  })

  it('releases the gate, then runs the inner onUpdate (returning its result) on confirm', async () => {
    const inner = jest.fn(() => ({ value: 'committed' }))
    const { result } = renderHook(() =>
      useConfirmOnUpdate<JsonData>({ confirmOn: ['delete'], onUpdate: inner })
    )
    const { control, hold, release } = makeControl()

    let res!: Promise<unknown>
    act(() => {
      res = Promise.resolve(result.current.onUpdate(makeInput('delete'), control))
    })
    expect(hold).toHaveBeenCalledTimes(1)

    act(() => result.current.dialog.onConfirm())

    await act(async () => {
      await expect(res).resolves.toEqual({ value: 'committed' })
    })
    expect(release).toHaveBeenCalledTimes(1)
    expect(inner).toHaveBeenCalledTimes(1)
    // The commit (release) lands before the inner runs as a background settlement.
    expect(release.mock.invocationCallOrder[0]).toBeLessThan(inner.mock.invocationCallOrder[0])
  })

  it('skips the gate (no hold) and calls inner directly for non-matching events', async () => {
    const inner = jest.fn(() => undefined)
    const { result } = renderHook(() =>
      useConfirmOnUpdate<JsonData>({ confirmOn: ['delete'], onUpdate: inner })
    )
    const { control, hold } = makeControl()

    let res!: Promise<unknown>
    act(() => {
      res = Promise.resolve(result.current.onUpdate(makeInput('edit'), control))
    })

    await expect(res).resolves.toBeUndefined()
    expect(hold).not.toHaveBeenCalled()
    expect(inner).toHaveBeenCalledTimes(1)
    // The live control is passed straight through, so a non-gated inner can
    // call hold() itself.
    expect(inner).toHaveBeenCalledWith(makeInput('edit'), control)
    expect(result.current.dialog.isOpen).toBe(false)
  })

  it('supports a predicate confirmOn', async () => {
    const { result } = renderHook(() =>
      useConfirmOnUpdate({
        confirmOn: (input) => input.event === 'delete' && input.key === 'secret',
      })
    )

    // Non-matching key: no dialog, no hold, commits (undefined).
    const a = makeControl()
    let skip!: Promise<unknown>
    act(() => {
      skip = Promise.resolve(
        result.current.onUpdate(makeInput('delete', { key: 'public' }), a.control)
      )
    })
    await expect(skip).resolves.toBeUndefined()
    expect(a.hold).not.toHaveBeenCalled()
    expect(result.current.dialog.isOpen).toBe(false)

    // Matching key: the gate opens.
    const b = makeControl()
    act(() => {
      void result.current.onUpdate(makeInput('delete', { key: 'secret' }), b.control)
    })
    expect(b.hold).toHaveBeenCalledTimes(1)
    expect(result.current.dialog.isOpen).toBe(true)
  })

  it('resolves a function message against the update input', () => {
    const { result } = renderHook(() =>
      useConfirmOnUpdate({
        confirmOn: ['delete'],
        title: 'Confirm',
        message: (input) => `delete "${String(input.key)}"?`,
      })
    )

    act(() => {
      void result.current.onUpdate(makeInput('delete', { key: 'widget' }), makeControl().control)
    })

    expect(result.current.dialog.title).toBe('Confirm')
    expect(result.current.dialog.message).toBe('delete "widget"?')
  })
})
