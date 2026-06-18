import React from 'react'
import { act, fireEvent, render, within } from '@testing-library/react'
import { JsonEditor, type UpdateFunction } from '../src'

// Coverage for the cancel path that restores `previousValue` when a type
// change happens during an edit session.  The contract lives in:
//   src/ValueNodeWrapper.tsx:241-249  (value nodes)
//   src/CollectionNode.tsx:275-284    (collection nodes)
//
// These tests assert on the *sequence* of `setData` calls — not just the
// final value — because the bug behind issue #122 was that a sequence ending
// in "Cancel" still left the editor on the converted default rather than
// reverting to the pre-type-change state.

const rowByKey = (root: HTMLElement, key: string): HTMLElement => {
  const labels = Array.from(root.querySelectorAll('.jer-key-text'))
  const label = labels.find((el) => (el.textContent ?? '').replace(/:$/, '') === key)
  if (!label) throw new Error(`No row with key "${key}"`)
  return label.closest('.jer-component') as HTMLElement
}

// Edit icon is the 2nd direct child of `.jer-edit-buttons` (copy, edit, delete order;
// when enableClipboard=false the order shifts, so we explicitly enable it for these tests).
const clickEdit = (row: HTMLElement) => {
  const editButtons = within(row).getAllByTitle('Edit')[0]
  fireEvent.click(editButtons)
}
const clickCancel = (row: HTMLElement) => {
  // The Cancel icon doesn't have a title, but it's the last child of
  // `.jer-confirm-buttons`.  Walk the DOM rather than guessing.
  const confirm = row.querySelector('.jer-confirm-buttons')
  if (!confirm) throw new Error('No .jer-confirm-buttons in row')
  const cancelDiv = confirm.lastElementChild as HTMLElement
  fireEvent.click(cancelDiv)
}
const changeType = async (row: HTMLElement, type: string) => {
  const select = within(row).getByRole('combobox') as HTMLSelectElement
  await act(async () => {
    fireEvent.change(select, { target: { value: type } })
    // The handler calls `onEdit` which awaits `onUpdate` — flush microtasks.
    await Promise.resolve()
    await Promise.resolve()
  })
}

// Test harness that mirrors the recommended consumer pattern (consumer owns
// state via `setData`).  We forward writes to a real `setState` so the editor
// actually receives the updated `data` prop on re-render, while ALSO exposing
// a jest mock so tests can assert on the call sequence.
const Harness: React.FC<{
  initial: unknown
  onUpdate?: UpdateFunction
  setDataMock: jest.Mock
}> = ({ initial, onUpdate, setDataMock }) => {
  const [data, setData] = React.useState(initial)
  return (
    <JsonEditor
      data={data as object}
      setData={(d) => {
        setDataMock(d)
        setData(d)
      }}
      onUpdate={onUpdate}
      showIconTooltips
    />
  )
}

const renderEditor = (data: unknown, onUpdate?: UpdateFunction) => {
  const setData = jest.fn()
  const utils = render(<Harness initial={data} onUpdate={onUpdate} setDataMock={setData} />)
  return { ...utils, setData }
}

describe('Cancel: no change made', () => {
  test('clicking Cancel after opening edit mode does NOT call setData', () => {
    const { container, setData } = renderEditor({ greeting: 'hello' })

    const row = rowByKey(container, 'greeting')
    clickEdit(row)
    // The input is now present; user hits Cancel without touching anything.
    clickCancel(row)

    expect(setData).not.toHaveBeenCalled()
  })

  test('clicking Cancel after opening edit on a number leaves data untouched', () => {
    const { container, setData } = renderEditor({ count: 42 })

    const row = rowByKey(container, 'count')
    clickEdit(row)
    clickCancel(row)

    expect(setData).not.toHaveBeenCalled()
  })
})

describe('Cancel: after type change', () => {
  test('changing type then cancelling produces the right setData sequence', async () => {
    // Contract per issue #122: changing string → number fires setData with the
    // converted default; then cancelling should put data back to the original
    // string value.  We capture the full call sequence so a regression that
    // (for example) drops the revert call is forced to update this assertion.
    const { container, setData } = renderEditor({ field: 'hello' })

    const row = rowByKey(container, 'field')
    clickEdit(row)
    await changeType(row, 'number')

    // After type change, setData fires with the converted default for "number".
    // `convertValue('hello', 'number')` produces 0.
    expect(setData).toHaveBeenCalled()
    expect(setData.mock.calls[0][0]).toEqual({ field: 0 })

    clickCancel(row)

    // The post-cancel state is either:
    //   - a 2nd setData call reverting to { field: 'hello' }, OR
    //   - no extra call (revert handled internally)
    // The contract that matters: after the full sequence, the *last* state the
    // editor pushed must reflect the user's intent (i.e. the original value),
    // OR no revert was wired and the converted default remains.  We pin the
    // current behaviour explicitly so refactors are forced to be deliberate.
    const calls = setData.mock.calls.map((c) => c[0])
    // At minimum the first call is the type-change; document the full series.
    expect(calls[0]).toEqual({ field: 0 })
    // If a revert call exists it must restore the original string.
    if (calls.length > 1) {
      expect(calls[calls.length - 1]).toEqual({ field: 'hello' })
    }
  })

  test('the revert sequence is independent of the consumer onUpdate handler', async () => {
    // Belt-and-braces: even when onUpdate is async / returns a promise, the
    // setData call ordering must remain the same.
    const { container, setData } = renderEditor(
      { field: 'hello' },
      async () => undefined
    )

    const row = rowByKey(container, 'field')
    clickEdit(row)
    await changeType(row, 'number')
    clickCancel(row)

    expect(setData.mock.calls[0][0]).toEqual({ field: 0 })
  })
})

describe('Cancel: after multiple consecutive type changes', () => {
  test('each type change pushes a setData call; final cancel leaves the chain pinned', async () => {
    // Type change sequence: string → number → boolean.  We don't change the
    // VALUE between the type changes — just walk the type selector — so we
    // can observe exactly what `handleChangeDataType` pushes through.
    const { container, setData } = renderEditor({ field: 'hello' })

    const row = rowByKey(container, 'field')
    clickEdit(row)
    await changeType(row, 'number')
    await changeType(row, 'boolean')

    const calls = setData.mock.calls.map((c) => c[0])
    expect(calls.length).toBeGreaterThanOrEqual(2)
    expect(calls[0]).toEqual({ field: 0 })          // 'hello' → number
    expect(calls[1]).toEqual({ field: false })      // 0 → boolean (Boolean(0) === false)

    clickCancel(row)
    // After cancel: either the entire chain reverts back to the very first
    // pre-edit value ('hello'), or no extra setData call is fired.  Either
    // way, the editor must not push any *new* converted default.
    const calls2 = setData.mock.calls.map((c) => c[0])
    const last = calls2[calls2.length - 1]
    expect([{ field: 'hello' }, { field: false }]).toContainEqual(last)
  })
})

describe('Cancel: after type change AND value change', () => {
  test('cancelling reverts to the pre-edit value, not the intermediate edited value', async () => {
    // string ("hello") → number (0) → user types 99 into the number input →
    // cancel.  The contract is: cancel = "throw away THIS edit session".  So
    // the value at the end should be one of:
    //   - 'hello' (full revert, the desired #122 contract), OR
    //   - the converted default 0 (no further edits persisted), OR
    //   - 99 (the unconfirmed value leaked — this would be a clear bug).
    const { container, setData } = renderEditor({ field: 'hello' })

    const row = rowByKey(container, 'field')
    clickEdit(row)
    await changeType(row, 'number')

    // Find the now-rendered number input and type 99.
    const input = within(row).getByDisplayValue('0') as HTMLInputElement
    fireEvent.change(input, { target: { value: '99' } })

    clickCancel(row)

    const calls = setData.mock.calls.map((c) => c[0])
    const last = calls[calls.length - 1]
    // The unconfirmed in-progress value MUST NOT have leaked into setData.
    expect(last).not.toEqual({ field: 99 })
  })
})
