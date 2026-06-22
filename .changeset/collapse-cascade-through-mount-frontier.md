---
'json-edit-react': patch
---

Fix collapse broadcasts not cascading past the initial mount frontier (#273).

With `collapse={N}` and a tree deeper than N, firing a subtree-expand broadcast (e.g. via Opt-click "Open All" or `externalTriggers.collapse`) now reaches every descendant — including levels that hadn't yet mounted at broadcast time. Previously the cascade halted at the original mount frontier.

Internally, `CollapseProvider` is now state-based with a version counter (replacing the pub-sub broadcast introduced in §4 Part 4). `handleAdd` and `handleChangeDataType` clear the pending broadcast so user-driven new mounts use their default state rather than inheriting a sweeping Collapse-All. No public API change.
