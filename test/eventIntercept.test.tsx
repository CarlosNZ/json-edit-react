/**
 * `onEventIntercept` — the Category-1 soft gate (§17 Phase 1).
 *
 * Fires at the START of a user-initiated interaction; returning truthy ("I'll
 * take it over") suppresses the default action, `void`/`false` proceeds. These
 * pin the contract:
 *  - the gate fires for startEdit / startRename / startAdd / delete with the
 *    flat `{ event, ...NodeData }` payload;
 *  - returning `true` (sync or async) suppresses the action;
 *  - returning `undefined`/`false` lets it run as normal;
 *  - `editorRef.*` enters below the gate (never re-fires it).
 *
 * `move` (drag-and-drop drop) is wired the same way, but a drop-event test is
 * deferred to the DnD test gap tracked in #270.
 */

import { createRef } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonEditor } from '../src/JsonEditor'
import { type JsonEditorHandle } from '../src/types'

const noop = () => {}

describe('onEventIntercept — fires + suppresses', () => {
  test('startEdit: returning true blocks the value editor and reports the event', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onEventIntercept = jest.fn(() => true)
    render(
      <JsonEditor data={{ greeting: 'hello' }} setData={setData} onEventIntercept={onEventIntercept} />
    )

    await user.dblClick(screen.getByText('"hello"'))

    expect(screen.queryByRole('textbox')).toBeNull()
    expect(onEventIntercept).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'startEdit', path: ['greeting'], key: 'greeting' })
    )
  })

  test('startEdit: the edit pencil is also gated', async () => {
    const user = userEvent.setup()
    const onEventIntercept = jest.fn(() => true)
    render(
      <JsonEditor
        data={{ greeting: 'hello' }}
        setData={noop}
        onEventIntercept={onEventIntercept}
        showIconTooltips
      />
    )

    const row = screen.getByText('"hello"').closest('.jer-component') as HTMLElement
    await user.click(row.querySelector('[title="Edit"]') as HTMLElement)

    expect(screen.queryByRole('textbox')).toBeNull()
    expect(onEventIntercept).toHaveBeenCalledWith(expect.objectContaining({ event: 'startEdit' }))
  })

  test('startRename: returning true blocks the key editor', async () => {
    const user = userEvent.setup()
    const onEventIntercept = jest.fn(() => true)
    render(
      <JsonEditor data={{ oldName: 2 }} setData={noop} onEventIntercept={onEventIntercept} />
    )

    await user.dblClick(screen.getByText('oldName'))

    expect(screen.queryByDisplayValue('oldName')).toBeNull()
    expect(onEventIntercept).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'startRename', path: ['oldName'], key: 'oldName' })
    )
  })

  test('startAdd: returning true blocks the new-key input', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <JsonEditor
        data={{ existing: 'value' }}
        setData={noop}
        onEventIntercept={() => true}
        showIconTooltips
      />
    )

    await user.click(screen.getByTitle('Add'))

    expect(container.querySelector('input.jer-input-new-key')).toBeNull()
  })

  test('startAdd: reports the startAdd event', async () => {
    const user = userEvent.setup()
    const onEventIntercept = jest.fn(() => true)
    render(
      <JsonEditor
        data={{ existing: 'value' }}
        setData={noop}
        onEventIntercept={onEventIntercept}
        showIconTooltips
      />
    )

    await user.click(screen.getByTitle('Add'))

    expect(onEventIntercept).toHaveBeenCalledWith(expect.objectContaining({ event: 'startAdd' }))
  })

  test('delete: returning true suppresses the delete (no setData)', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onEventIntercept = jest.fn(() => true)
    render(
      <JsonEditor
        data={{ x: 'hi', y: 'bye' }}
        setData={setData}
        onEventIntercept={onEventIntercept}
        showIconTooltips
      />
    )

    const xRow = screen.getByText('"hi"').closest('.jer-component') as HTMLElement
    await user.click(xRow.querySelector('[title="Delete"]') as HTMLElement)

    expect(setData).not.toHaveBeenCalled()
    expect(onEventIntercept).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'delete', path: ['x'], key: 'x' })
    )
  })
})

describe('onEventIntercept — proceeds when not taken over', () => {
  test('returning undefined lets the edit open as normal', async () => {
    const user = userEvent.setup()
    const onEventIntercept = jest.fn(() => undefined)
    render(
      <JsonEditor data={{ greeting: 'hello' }} setData={noop} onEventIntercept={onEventIntercept} />
    )

    await user.dblClick(screen.getByText('"hello"'))

    expect(await screen.findByRole('textbox')).toBeInTheDocument()
    expect(onEventIntercept).toHaveBeenCalled()
  })

  test('returning false lets the delete proceed', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(
      <JsonEditor
        data={{ x: 'hi', y: 'bye' }}
        setData={setData}
        onEventIntercept={() => false}
        showIconTooltips
      />
    )

    const xRow = screen.getByText('"hi"').closest('.jer-component') as HTMLElement
    await user.click(xRow.querySelector('[title="Delete"]') as HTMLElement)

    expect(setData).toHaveBeenCalledWith({ y: 'bye' })
  })
})

describe('onEventIntercept — async', () => {
  test('a callback resolving true suppresses the edit', async () => {
    const user = userEvent.setup()
    const onEventIntercept = jest.fn(async () => true)
    render(
      <JsonEditor data={{ greeting: 'hello' }} setData={noop} onEventIntercept={onEventIntercept} />
    )

    await user.dblClick(screen.getByText('"hello"'))
    // Flush the awaited intercept; the editor must still be closed.
    await act(async () => {})

    expect(screen.queryByRole('textbox')).toBeNull()
  })
})

describe('onEventIntercept — editorRef enters below the gate', () => {
  test('editorRef.startEdit does not fire onEventIntercept and still opens', () => {
    const onEventIntercept = jest.fn(() => true)
    const ref = createRef<JsonEditorHandle>()
    render(
      <JsonEditor
        data={{ greeting: 'hello' }}
        setData={noop}
        onEventIntercept={onEventIntercept}
        editorRef={ref}
      />
    )

    act(() => ref.current!.startEdit({ path: ['greeting'] }))

    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(onEventIntercept).not.toHaveBeenCalled()
  })
})
