import { useMemo, useState } from 'react'
import {
  JsonEditor,
  type CustomComponentProps,
  type JsonData,
  type NodeData,
} from '@json-edit-react'
import { booleanToggleDefinition } from '@json-edit-react/components'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

// A from-scratch BigInt node — for values JSON and plain JS
// numbers can't hold (these run to 128-bit, far past Number's
// 2^53 safe-integer limit). It wires the full non-plain-value
// lifecycle as two mirrored conversion pairs:
//
//   Inline edit buffer — BigInt <-> digit string:
//     - toStandardType:   bigint → string (seeds the editor)
//     - fromStandardType: string → bigint (on confirm; THROWS
//       on a non-integer, which rejects the edit)
//
//   Edit-as-JSON — BigInt <-> a tagged object (JSON has no
//   bigint, and JSON.stringify throws on a raw one):
//     - stringifyReplacer: bigint → { __type, value }
//     - parseReviver:      { __type, value } → bigint
//
// showInTypeSelector + editOnTypeSwitch also exercise the
// SEED path: switch a digit string to BigInt and it carries
// over; switch the name and the throw falls back to
// defaultValue (Esc restores the original).
//
// "Enable processing" toggles all four hooks at once: turn it
// off and editing an ID commits a plain string (no conversion),
// and "Edit as JSON" can no longer serialize the BigInts.

const initialData = {
  'Enable processing': true,
  username: 'bruce_banner',
  userId: 1149005550217437184n,
  sessionToken: 18446744073709551615n,
  accessKey: 79228162514264337593543950335n,
  publicKey: 340282366920938463463374607431768211455n,
}

// The JSON form: a tagged object we can recognise on the way
// back in (a bare string would be indistinguishable from a
// normal string value).
const isBigIntTag = (v: unknown): v is { value: string } =>
  !!v && typeof v === 'object' && (v as Record<string, unknown>).__type === 'BigInt'

// Displays the BigInt; renders a plain text editor (digit
// string) while editing. The digits ARE the standard-type
// buffer — `fromStandardType` turns them back into a BigInt on
// confirm.
const BigIntNode = ({
  value,
  isEditing,
  setIsEditing,
  setValue,
  onKeyDown,
  getStyles,
  nodeData,
}: CustomComponentProps) => {
  if (isEditing)
    return (
      <input
        type="text"
        autoFocus
        value={String(value)}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        style={getStyles('input', nodeData)}
      />
    )
  return (
    <span onDoubleClick={() => setIsEditing(true)} style={getStyles('number', nodeData)}>
      {String(value)}
      <span style={{ opacity: 0.5 }}>n</span>
    </span>
  )
}

// Builds the definition with or without the four conversion
// hooks. Toggle "Enable processing" off and they're omitted —
// the BigInt still displays, but editing no longer round-trips
// through BigInt, so you can see what each hook buys you.
const makeBigIntDefinition = (processing: boolean) => ({
  condition: ({ value }: NodeData) => typeof value === 'bigint',
  component: BigIntNode,
  name: 'BigInt', // label in the Type selector
  showInTypeSelector: true,
  showOnView: true,
  showOnEdit: true,
  editOnTypeSwitch: true,
  defaultValue: 0n,
  ...(processing
    ? {
        // --- Inline edit buffer: BigInt <-> digit string ---
        toStandardType: (value: unknown) => String(value),
        // Throws on a non-integer ("12.5", "abc") — rejecting
        // the confirm and keeping the editor open.
        fromStandardType: (value: unknown) => BigInt(value as string),
        // --- Edit as JSON: BigInt <-> tagged object ---
        stringifyReplacer: (value: unknown) =>
          typeof value === 'bigint' ? { __type: 'BigInt', value: value.toString() } : value,
        parseReviver: (value: unknown) => (isBigIntTag(value) ? BigInt(value.value) : value),
      }
    : {}),
})

// With the hooks off there's no stringifyReplacer, so a raw
// BigInt reaches JSON.stringify (used by "Edit as JSON" and
// copy), which throws — catch it and show why, rather than
// crash the editor.
const jsonStringify = (data: JsonData, replacer?: (key: string, value: unknown) => unknown) => {
  try {
    return JSON.stringify(data, replacer, 2)
  } catch {
    return '⚠️ A BigInt can\'t be serialized to JSON without a\nstringifyReplacer — turn "Enable processing" on.'
  }
}

export default function BigIntExample() {
  const [data, setData] = useState<JsonData>(initialData)
  const processing = (data as { 'Enable processing'?: boolean })['Enable processing'] ?? true
  // BigInt for the keys; the pre-built BooleanToggle renders the
  // "Enable processing" switch (no config needed).
  const customNodeDefinitions = useMemo(
    () => [makeBigIntDefinition(processing), booleanToggleDefinition()],
    [processing]
  )

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useExampleProps()} // ---cut---
      rootName="user"
      customNodeDefinitions={customNodeDefinitions}
      jsonStringify={jsonStringify}
      allowDelete={false}
    />
  )
}
