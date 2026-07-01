import { type Dispatch, type SetStateAction } from 'react'
import { StringEdit, toPathString, type CustomComponentProps, type JsonData } from 'json-edit-react'

export interface AutoTypeProps {
  /**
   * Parser used to infer the type from the typed text. Defaults to
   * `JSON.parse`; pass a more lenient parser (e.g. `JSON5.parse`) to accept
   * unquoted keys, single quotes, trailing commas, etc. Mirrors core's
   * `jsonParse` signature, so the same function passed to
   * `<JsonEditor jsonParse={…}>` works here too.
   */
  jsonParse?: (input: string, reviver?: (key: string, value: string) => unknown) => JsonData
}

// Edit-only node (the definition sets `showOnView: false`), so this is only
// ever rendered while editing — the body is just a plain text input. The
// value's type is decided from the text on commit, in the definition's
// `fromStandardType`.
export const AutoTypeComponent = (props: CustomComponentProps<AutoTypeProps>) => {
  const { value, setValue, getStyles, nodeData, handleEdit, ...rest } = props

  // The buffer holds the committed value verbatim until the first keystroke
  // (StringEdit only writes on input), so stringify non-strings for display.
  // The definition guards to non-collection nodes, so `value` here is only
  // ever a primitive — `String` matches what a JSON parser round-trips
  // (12.3 → "12.3", true → "true", null → "null").
  const text = typeof value === 'string' ? value : String(value)

  return (
    <StringEdit
      pathString={toPathString(nodeData.path)}
      styles={getStyles('input', nodeData)}
      {...rest}
      value={text}
      setValue={setValue as Dispatch<SetStateAction<string>>}
      handleEdit={handleEdit}
    />
  )
}
