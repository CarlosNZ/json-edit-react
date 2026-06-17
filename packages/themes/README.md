# @json-edit-react/themes

Pre-built themes for [json-edit-react](https://github.com/CarlosNZ/json-edit-react).

## Install

```sh
npm install @json-edit-react/themes
# or
yarn add @json-edit-react/themes
# or
pnpm add @json-edit-react/themes
```

`json-edit-react` is a peer dependency.

## Usage

```tsx
import { JsonEditor } from 'json-edit-react'
import { githubDarkTheme } from '@json-edit-react/themes'

<JsonEditor data={data} setData={setData} theme={githubDarkTheme} />
```

## Available themes

- `githubDarkTheme`
- `githubLightTheme`
- `monoDarkTheme`
- `monoLightTheme`
- `candyWrapperTheme`
- `psychedelicTheme`
- `tmfTheme`

## License

MIT
