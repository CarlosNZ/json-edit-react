# Reactive validation — `useValidationState`

Run a validator over the whole document and get back a queryable, identity-stable error index. Style functions, `allow*` filters, and custom-node `condition`s can then ask "is this node invalid?" in O(1) — and, crucially, get the **right answer for cross-branch effects** that fine-grained re-rendering would otherwise leave stale. Zero runtime dependencies (validators are the consumer's own, passed in).

This is the reactive complement to schema-driven prevention ([#285](https://github.com/CarlosNZ/json-edit-react/issues/285)) and a commit-time gate: it flags problems as they exist in the data, including data that was **already invalid when loaded**. Origin: [#197](https://github.com/CarlosNZ/json-edit-react/issues/197), design discussion in [#357](https://github.com/CarlosNZ/json-edit-react/issues/357).

## The problem it solves

Document validity is a whole-document property: an edit at one node can flip the validity of another node on a *different branch* (JSON Schema `if/then`, `dependentRequired`, discriminated unions). Under json-edit-react's fine-grained re-rendering that other node doesn't re-render when you edit the first one, so validating inline inside its style function / filter / condition shows a stale result until something else forces it to re-render. `useValidationState` fixes this by tying the result's *identity* to the error set, so the consumer can drive a memo-piercing channel (theme, `customNodeDefinitions`, `allow*`) that re-renders the tree exactly when validity changes — and never on a valid→valid commit.

## Quick start — flag invalid nodes red

`validationStyles` turns the state into a partial theme; compose it over your own and memoize on the validation object:

```tsx
import { useMemo, useState } from 'react'
import { JsonEditor } from 'json-edit-react'
import { useValidationState, validationStyles, ajvAdapter } from '@json-edit-react/utils'
import Ajv from 'ajv'

const ajv = new Ajv({ allErrors: true })
const validate = ajvAdapter(ajv.compile(schema)) // compile once, module scope

const MyEditor = () => {
  const [data, setData] = useState(initialData)

  const validation = useValidationState(data, validate)
  const theme = useMemo(() => [myTheme, validationStyles(validation)], [validation])

  return <JsonEditor data={data} setData={setData} theme={theme} />
}
```

`[validation]` — not an inline array literal — is what keeps the tree from re-rendering on every keystroke; the validation object only changes identity when the error set actually changes.

## Consumption recipes

The state is just a queryable object, so it drives any render-time channel:

- **Styles (recommended for "go red"):** `validationStyles(validation, { error, within })` — leaf slots paint `hasErrorAt` nodes; pass `within` to mark collection ancestors via `hasErrorWithin`. Inline styles only (color/border/etc.), so no pseudo-elements.
- **A glyph / icon / tooltip:** a custom-node component that wraps `originalNode` and appends content when `validation.hasErrorAt(nodeData.path)`. Memoize `customNodeDefinitions` on `[validation]`. (See [#358](https://github.com/CarlosNZ/json-edit-react/issues/358).)
- **Disable editing of invalid subtrees:** `allowEdit={useMemo(() => (nd) => !validation.hasErrorWithin(nd.path), [validation])}`.
- **A document-level banner / disabled Save button:** read `validation.isValid` and `validation.errors` directly.

## API

`useValidationState(data, validate)` → `ValidationState`:

| Member | Type | Behaviour |
| --- | --- | --- |
| `isValid` | `boolean` | True when there are no issues. |
| `errors` | `ValidationIssue[]` | Every issue, in the order the validator produced them. |
| `hasErrorAt` | `(path) => boolean` | Is there an issue at *exactly* this node? The style-function hot path. |
| `errorsAt` | `(path) => ValidationIssue[]` | Issues at exactly this node — for tooltips, messages, summaries. |
| `hasErrorWithin` | `(path) => boolean` | Issue at this node **or any descendant** — for ancestor marking. |

`validate` is a `Validate` — `(data) => ValidationIssue[]`. Wrap a library validator with an adapter, or write one inline:

```ts
const validate: Validate = (data) =>
  data.total > budget ? [{ path: ['total'], message: 'over budget', keyword: 'max' }] : []
```

A `ValidationIssue` is `{ path, message, keyword?, raw? }`, where `path` is the node location (`[]` is the root) and `raw` is the library's original error object (an escape hatch).

### `ajvAdapter`

`ajvAdapter(ajv.compile(schema))` returns a `Validate`. Compile AJV with `allErrors: true` to surface everything at once. It normalizes AJV's `instancePath` JSON-Pointers into node paths (decoding `~0`/`~1`, coercing array indices to numbers) and keeps `required` errors at the parent path (the missing child has no node to style) with the property named in the message. The package takes **no `ajv` dependency** — the adapter is typed against AJV's error *shape*, so you bring your own AJV.

## Performance

`validate` runs once per `data` change (which, in json-edit-react, is per commit — not per keystroke), and every lookup after that is an O(1) map/set hit. The state object's reference is held stable while the error set is unchanged, so valid→valid commits keep the §16 node-memo boundary fully intact; only a genuine change in validity re-renders the tree, once.

## `useStableValue`

The identity-stabilizer `useValidationState` is built on is exported in its own right — see the [stable-value README](../stable-value) — for any other cross-branch derived value (duplicate detection, doc-wide totals) you want to drive a memo-piercing channel with.
