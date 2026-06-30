import { isCollection, type CustomNodeDefinition } from 'json-edit-react'
import { createDefinitionFactory } from '../_common/createDefinitionFactory'
import { AutoTypeComponent, type AutoTypeProps } from './component'

// An edit-only node that infers a value's type from the text typed into a
// plain input — no Type selector. The text is parsed (JSON by default), so
// "12.3" → number, "true" → boolean, "null" → null, '{"a":1}' → object/array,
// and anything that doesn't parse stays a string. Applies to every value
// (non-collection) node; collections keep their built-in "Edit as JSON"
// editor, through which a primitive can still be typed in.
//
// The `condition` doubles as the guard (value nodes only): a consumer
// `condition` override is treated as targeting and ANDed with this by the
// factory, so it can only narrow WHERE auto-typing applies.
const AutoTypeDefinition: CustomNodeDefinition<AutoTypeProps> = {
  condition: ({ value }) => !isCollection(value),
  component: AutoTypeComponent,
  showOnView: false, // edit-only — the standard node renders in view mode
  showOnEdit: true,
  showInTypeSelector: false,
  fromStandardType: (value, nodeData, componentProps) => {
    const parse = componentProps?.jsonParse ?? JSON.parse
    // `value` is the edit buffer; until the user types it's the committed
    // value verbatim, and `nodeData.value` is the committed value (stable for
    // the session). So an unchanged confirm keeps the original untouched — a
    // string that merely looks like another type ("12.3", "true") doesn't
    // silently flip when the editor is opened and closed without an edit.
    if (typeof value !== 'string') return value
    if (value === nodeData.value) return value
    try {
      return parse(value)
    } catch {
      return value
    }
  },
}

export const autoTypeDefinition = createDefinitionFactory(AutoTypeDefinition)
