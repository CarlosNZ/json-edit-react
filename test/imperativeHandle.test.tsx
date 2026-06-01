/**
 * End-to-end tests for the editing actions on the `editorRef` imperative
 * handle: `startEdit`, `cancelEdit`, `confirmEdit`.
 *
 * These pin the public contract of the handle:
 *  - `startEdit({ path })` puts the targeted node into edit mode (a textbox).
 *  - `cancelEdit()` leaves edit mode without committing.
 *  - `confirmEdit()` commits the in-progress edit (calls `setData`).
 *  - `startEdit` reveals a target that's collapsed below the mount frontier,
 *    riding the same state-based reveal the Tab navigation uses.
 *  - `startEdit` respects the per-node `restrictEdit` filter by default (and
 *    returns `false` when blocked), and bypasses it when `overrideRestrictions:
 *    true` is passed.
 */

import { createRef } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonEditor } from '../src/JsonEditor'
import { type JsonEditorHandle } from '../src/types'

const noop = () => {}

describe('editorRef handle — editing actions', () => {
  test('startEdit opens an editor at a visible leaf', () => {
    const ref = createRef<JsonEditorHandle>()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} editorRef={ref} />)
    expect(screen.queryByRole('textbox')).toBeNull()

    act(() => ref.current!.startEdit({ path: ['greeting'] }))

    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  test('cancelEdit leaves edit mode without committing', () => {
    const setData = jest.fn()
    const ref = createRef<JsonEditorHandle>()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={setData} editorRef={ref} />)

    act(() => ref.current!.startEdit({ path: ['greeting'] }))
    expect(screen.getByRole('textbox')).toBeInTheDocument()

    act(() => ref.current!.cancelEdit())
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(setData).not.toHaveBeenCalled()
  })

  test('confirmEdit commits the in-progress edit via setData', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const ref = createRef<JsonEditorHandle>()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={setData} editorRef={ref} />)

    act(() => ref.current!.startEdit({ path: ['greeting'] }))
    const textbox = screen.getByRole('textbox')
    await user.clear(textbox)
    await user.type(textbox, 'world')

    // The update path is async (onEdit awaits the consumer's update fn before
    // calling setData), so flush microtasks inside act.
    await act(async () => {
      ref.current!.confirmEdit()
    })

    expect(setData).toHaveBeenCalledWith({ greeting: 'world' })
    // confirmEdit also exits edit mode.
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  test('startEdit reveals a target collapsed below the mount frontier', () => {
    // With `collapse={1}`, `outer` (level 1) starts collapsed and its
    // descendants are NOT mounted. startEdit on a deep path must cascade the
    // ancestors open (the same state-based reveal Tab navigation relies on)
    // until the leaf mounts in edit mode.
    const ref = createRef<JsonEditorHandle>()
    render(
      <JsonEditor
        data={{ outer: { inner: { leaf: 'deep' } } }}
        setData={noop}
        collapse={1}
        editorRef={ref}
      />
    )
    // Pre-condition: the deep subtree is unmounted.
    expect(screen.queryByText('inner')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()

    act(() => ref.current!.startEdit({ path: ['outer', 'inner', 'leaf'] }))

    // The cascade revealed the target and put it in edit mode.
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  test('startEdit respects restrictEdit by default (no-op when restricted)', () => {
    const ref = createRef<JsonEditorHandle>()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} restrictEdit editorRef={ref} />)

    let result: boolean | undefined
    act(() => {
      result = ref.current!.startEdit({ path: ['greeting'] })
    })

    // restrictEdit is honoured — returns false, no editor opened, and the target
    // isn't redirected to some other node either.
    expect(result).toBe(false)
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  test('startEdit with overrideRestrictions bypasses restrictEdit', () => {
    // Intended use case: lock everything with restrictEdit, then imperatively
    // enable editing on one node via an explicit override.
    const ref = createRef<JsonEditorHandle>()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} restrictEdit editorRef={ref} />)

    let result: boolean | undefined
    act(() => {
      result = ref.current!.startEdit({ path: ['greeting'], overrideRestrictions: true })
    })

    expect(result).toBe(true)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  test('startEdit respects a per-node restrictEdit function and reports via return value', () => {
    // Only `b` is restricted. Default startEdit should open `a` but not `b`.
    const ref = createRef<JsonEditorHandle>()
    render(
      <JsonEditor
        data={{ a: 'one', b: 'two' }}
        setData={noop}
        restrictEdit={({ key }) => key === 'b'}
        editorRef={ref}
      />
    )

    let blocked: boolean | undefined
    act(() => {
      blocked = ref.current!.startEdit({ path: ['b'] })
    })
    expect(blocked).toBe(false)
    expect(screen.queryByRole('textbox')).toBeNull()

    let allowed: boolean | undefined
    act(() => {
      allowed = ref.current!.startEdit({ path: ['a'] })
    })
    expect(allowed).toBe(true)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})
