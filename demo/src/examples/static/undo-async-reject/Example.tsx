import { type CSSProperties, useState } from 'react'
import { JsonEditor, type JsonData } from '@json-edit-react'
import { useUndo } from '@json-edit-react/utils'
import { useEditorDefaults } from '@example-resources'

const initialData = { name: 'Alice', age: 30 }

// useUndo's optional `onEditEvent` corrector, in action.
//
// An ASYNC `onUpdate` that rejects commits optimistically and
// then reverts — both writes go through useUndo's `set`, so
// without help the reverted (invalid) value lands in history
// and "Undo" steps back to it. Wiring the hook's `onEditEvent`
// erases that reverted commit.
//
// Toggle the checkbox to compare:
//   OFF — how the hook behaves without `onEditEvent` (the gap)
//   ON  — the corrector cleans it up
export default function UndoAsyncReject() {
  const [data, setData] = useState<JsonData>(initialData)
  const [correct, setCorrect] = useState(false)
  const { set, undo, redo, canUndo, canRedo, onEditEvent } = useUndo(data, setData)

  return (
    <div>
      <div style={css.panel}>
        <label style={css.check}>
          <input type="checkbox" checked={correct} onChange={(e) => setCorrect(e.target.checked)} />
          Correct history (wire <code>onEditEvent</code>)
        </label>
        <div style={css.row}>
          <button style={css.button} onClick={undo} disabled={!canUndo}>
            Undo
          </button>
          <button style={css.button} onClick={redo} disabled={!canRedo}>
            Redo
          </button>
          <span style={css.hint}>canUndo: {String(canUndo)}</span>
        </div>
      </div>

      <JsonEditor
        data={data}
        setData={set}
        {...useEditorDefaults()}
        rootName="user"
        onUpdate={async (props) => {
          // A slow server check that rejects an absurd age.
          // It's async, so the edit applies optimistically
          // and reverts when this resolves to `false`.
          await new Promise((resolve) => setTimeout(resolve, 600))
          const tooOld =
            props.event === 'edit' && props.key === 'age' && Number(props.newValue) > 150
          return tooOld ? false : undefined
        }}
        // Wire (or don't) the corrector — the whole point here.
        onEditEvent={correct ? onEditEvent : undefined}
      />
    </div>
  )
}

// Plain scratchpad styles (this is a dev-only example).
const css: Record<string, CSSProperties> = {
  panel: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 },
  row: { display: 'flex', gap: 8, alignItems: 'center' },
  check: { display: 'flex', gap: 6, alignItems: 'center' },
  button: { padding: '4px 12px', cursor: 'pointer' },
  hint: { opacity: 0.7, fontSize: '0.85em' },
}
