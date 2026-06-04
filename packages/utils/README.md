# @json-edit-react/utils

Utility hooks and helpers for [json-edit-react](https://github.com/CarlosNZ/json-edit-react).

> **Status: early/nascent.** This package is being assembled — the helpers below
> are planned, not all shipped yet. See the linked issues for current state.

## Install

```sh
npm install @json-edit-react/utils
# or
yarn add @json-edit-react/utils
# or
pnpm add @json-edit-react/utils
```

`json-edit-react` and `react` are peer dependencies.

## What's here

- **Confirm-before-update hooks** — gate edits/deletes on a confirmation dialog
  without hand-rolling the deferred-promise dance.
  ([#307](https://github.com/CarlosNZ/json-edit-react/issues/307))
- **JSON Schema → Filter Functions** — generate `allowEdit` / `allowDelete` /
  `allowAdd` (etc.) functions from a JSON Schema so the editor UI can't produce
  invalid data in the first place.
  ([#285](https://github.com/CarlosNZ/json-edit-react/issues/285))
- **Search helpers** — ready-made `searchFilter` functions for common search
  patterns. ([#319](https://github.com/CarlosNZ/json-edit-react/issues/319))

## Usage

```tsx
import { JsonEditor } from 'json-edit-react'
// import { useConfirmOnUpdate } from '@json-edit-react/utils'
```

(Usage examples will be filled in as each helper lands.)

## License

MIT
