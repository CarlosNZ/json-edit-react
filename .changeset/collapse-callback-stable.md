---
'json-edit-react': patch
---

Stabilise the `onCollapse` callback internally so an inline consumer callback no longer churns the collapse context.

`CollapseProvider` now keeps `onCollapse` in a ref (mirroring how `EditingProvider` already handles `onEditEvent`) instead of listing it in `setCollapseState`'s dependencies. Previously, passing a fresh `onCollapse` identity each render recreated `setCollapseState` and the collapse context value, re-rendering every node that subscribes to it (every `CollectionNode`) on each parent render. Consumers no longer need to memoise `onCollapse` to avoid that. No API or behaviour change — the callback still fires once per command with the original `CollapseState`.
