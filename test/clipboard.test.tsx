/**
 * Clipboard props: `showClipboardButton` (Cat-1 boolean toggle) + `onCopy`
 * (Cat-3 observer).
 *
 *  - `showClipboardButton` (default true) shows/hides the copy button.
 *  - `onCopy` fires after a copy with
 *    `{ success, stringValue, type, ...NodeData }`.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonEditor } from '../src/JsonEditor'

const noop = () => {}

describe('showClipboardButton', () => {
  test('the copy button is shown by default', () => {
    render(<JsonEditor data={{ x: 'hello' }} setData={noop} showIconTooltips />)
    expect(screen.getAllByTitle('Copy to clipboard').length).toBeGreaterThan(0)
  })

  test('showClipboardButton={false} hides the copy button', () => {
    render(
      <JsonEditor data={{ x: 'hello' }} setData={noop} showClipboardButton={false} showIconTooltips />
    )
    expect(screen.queryByTitle('Copy to clipboard')).toBeNull()
  })
})

describe('onCopy', () => {
  test('fires after a successful copy with the flat NodeData payload', async () => {
    const user = userEvent.setup()
    // Define after setup() so this wins over userEvent's own clipboard stub.
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    const onCopy = jest.fn()
    render(
      <JsonEditor data={{ greeting: 'hello' }} setData={noop} onCopy={onCopy} showIconTooltips />
    )

    const row = screen.getByText('"hello"').closest('.jer-component') as HTMLElement
    await user.click(row.querySelector('[title="Copy to clipboard"]') as HTMLElement)

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('hello'))
    await waitFor(() =>
      expect(onCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          type: 'value',
          stringValue: 'hello',
          path: ['greeting'],
          key: 'greeting',
        })
      )
    )
  })

  test('a failed copy reports a CLIPBOARD_ERROR (§17: error is a JerError)', async () => {
    const user = userEvent.setup()
    const writeText = jest.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    const onCopy = jest.fn()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} onCopy={onCopy} showIconTooltips />)

    const row = screen.getByText('"hello"').closest('.jer-component') as HTMLElement
    await user.click(row.querySelector('[title="Copy to clipboard"]') as HTMLElement)

    await waitFor(() =>
      expect(onCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: { code: 'CLIPBOARD_ERROR', message: 'denied' },
        })
      )
    )
  })
})
