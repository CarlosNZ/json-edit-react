---
'json-edit-react': major
---

`JsonEditor` is now generic on the data type.

- `JsonEditor<T = JsonData>` — consumers can preserve their data shape across the component boundary: `<JsonEditor<MyShape> data={...} setData={...} />`.
- The generic flows through `data`, `setData`, and the root data slots of `UpdateFunction`, `OnChangeFunction`, `OnErrorFunction`, plus `NodeData.fullData` inside every `FilterFunction` variant.
- Default of `JsonData` keeps existing untyped code source-compatible. Per-node `value` and `parentData` slots stay wide (they are arbitrary-depth slices, no static type can describe them).
- **Breaking (json-edit-react v2)** only because the emitted `.d.ts` signatures change. Runtime behaviour is unchanged.

See the [migration guide](../migration-guide.md#3-jsoneditor-is-now-generic-on-the-data-type) for details and examples.
