import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonEditor } from 'json-edit-react'
import { and, byKey, byPath, matchesSearch, matchRecord, not } from '../src/filters'

// Integration layer for the filter kit: render a real <JsonEditor> and assert
// on the DOM. The unit suite (filters.test.ts) owns per-builder logic against
// synthetic NodeData; this file proves the complementary half — that the editor
// actually CONSUMES these predicates (searchFilter hides nodes, allow* gates the
// UI), that `searchText` is threaded through to them, and (since matchRecord /
// byPath lean on the editor-built `fullData`/`path`) that the real NodeData
// matches what the unit harness assumes. Deliberately small: a few high-value
// wirings, not every builder re-tested through the editor.
//
// Assertions use core Jest matchers only (toBeNull / queryByRole) — no jest-dom
// — so the file needs no extra ambient types.

const noop = () => {}

// A top-level array of records — the "Client list" shape, so matchRecord's
// default path ('*' = top-level items) targets each person.
const people = [
  { id: 1, name: 'Leanne Graham', username: 'Bret', email: 'leanne@example.com' },
  { id: 2, name: 'Ervin Howell', username: 'Antonette', email: 'ervin@example.com' },
]

describe('filter kit — wired into a live <JsonEditor>', () => {
  describe('searchFilter', () => {
    it('matchesSearch filters the rendered tree (searchText threaded in)', () => {
      render(
        <JsonEditor
          data={people}
          setData={noop}
          searchText="leanne"
          searchFilter={matchesSearch('all')}
        />
      )
      expect(screen.queryByText('"Leanne Graham"')).not.toBeNull()
      expect(screen.queryByText('"Ervin Howell"')).toBeNull()
    })

    it('matchRecord reveals a whole record from the editor-built NodeData', () => {
      render(
        <JsonEditor
          data={people}
          setData={noop}
          searchText="antonette"
          searchFilter={matchRecord({ fields: ['name', 'username'] })}
        />
      )
      // The matching record shows in full — a field that does NOT itself
      // contain the search text is still visible — and the other record is gone.
      expect(screen.queryByText('"Ervin Howell"')).not.toBeNull()
      expect(screen.queryByText('"ervin@example.com"')).not.toBeNull()
      expect(screen.queryByText('"Leanne Graham"')).toBeNull()
    })

    it('composes a path scope with a value search', () => {
      // Both emails contain "example.com"; the path scope keeps only record [1].
      render(
        <JsonEditor
          data={people}
          setData={noop}
          searchText="example.com"
          searchFilter={and(byPath('1.**'), matchesSearch('value'))}
        />
      )
      expect(screen.queryByText('"ervin@example.com"')).not.toBeNull()
      expect(screen.queryByText('"leanne@example.com"')).toBeNull()
    })
  })

  describe('allow* props', () => {
    it('allowEdit={not(byKey("id"))} gates the edit affordance per node', async () => {
      const user = userEvent.setup()
      render(
        <JsonEditor
          data={{ id: 'X1', name: 'Leanne', email: 'leanne@example.com' }}
          setData={noop}
          allowEdit={not(byKey('id'))}
          showIconTooltips
        />
      )

      const idRow = screen.getByText('"X1"').closest('.jer-component') as HTMLElement
      const nameRow = screen.getByText('"Leanne"').closest('.jer-component') as HTMLElement

      // id is locked, name is editable.
      expect(idRow.querySelector('[title="Edit"]')).toBeNull()
      expect(nameRow.querySelector('[title="Edit"]')).not.toBeNull()

      // End-to-end: dblClick opens an input on name, but not on the locked id.
      await user.dblClick(screen.getByText('"X1"'))
      expect(screen.queryByRole('textbox')).toBeNull()
      await user.dblClick(screen.getByText('"Leanne"'))
      expect(screen.queryByRole('textbox')).not.toBeNull()
    })
  })
})
