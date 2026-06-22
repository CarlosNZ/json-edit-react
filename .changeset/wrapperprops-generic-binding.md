---
'json-edit-react': patch
---

Fix `CustomNodeDefinition`'s `U` generic so it binds `wrapperProps`, not just `wrapperComponent`. The generic exists to keep a `wrapperComponent` and the `wrapperProps` config object it receives in sync, but `wrapperProps` was typed `Record<string, unknown>`, so a mismatch between the two went uncaught at compile time. It's now `wrapperProps?: U`, mirroring how `componentProps?: T` already binds the value-component generic. Default (un-parameterized) usage is unchanged, since `U` defaults to `Record<string, unknown>`.
