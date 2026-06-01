---
'json-edit-react': major
---

Fine-grained editing re-renders + React 18 requirement.

- **Breaking**: the React peer dependency is now `>=18.0.0` (was `>=16.0.0`). v2 uses React's built-in `useSyncExternalStore`.
- Editing state moved to a selectable external store. Previously every node subscribed to a single editing context, so starting/moving an edit re-rendered the whole tree. Each node now subscribes only to its own editing slice, so moving an edit between nodes re-renders just the nodes involved — a large win on big documents. No public API or behaviour change.
- Drag-while-editing is now blocked at drag-start (reading editing state imperatively) rather than by disabling `draggable` on every node, so starting/ending an edit no longer re-renders all draggable nodes.
