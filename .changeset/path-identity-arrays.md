---
'json-edit-react': major
---

Path identity is now `CollectionKey[]` everywhere instead of a dot-joined string.

- The internal editing-state, drag-source, and `areChildrenBeingEdited` checks all compare arrays directly, fixing two classes of bug at once:
  - Keys containing `.` no longer collide with deeper paths (e.g. `['foo.bar', 'baz']` is now distinguishable from `['foo', 'bar', 'baz']`).
  - The "is a descendant" check is a proper array prefix, not a string substring — so editing `foobar` no longer claims `foo`'s children are editing, and dragging `foo` no longer hides the drop highlight on `foobar`.
- `toPathString` is still exported, but its encoding changes to `/`-joined `encodeURIComponent` (e.g. `['data', 0, 'name']` → `'data/0/name'`). The result is now provably injective. The optional second `key?: 'key_'` argument is removed — the new identity model encodes value-vs-key mode as a field, not a string prefix. **If you only use `toPathString`'s output as an HTML `name`/`id`, no code change is needed.**

See the [migration guide](../migration-guide.md#5-topathstring-encoding-changed) for details.
