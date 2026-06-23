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
- `solarizedDarkTheme`
- `solarizedLightTheme`
- `draculaTheme`
- `monokaiTheme`
- `tokyoNightTheme`
- `r18jvTheme`

## Icon set credits

Several themes ship their own icon glyphs, sourced from the following open icon sets. Glyph paths are inlined (and recoloured via each theme's palette); all credit goes to the original authors.

| Icon set                                                         | License    | Used by                                             |
| ---------------------------------------------------------------- | ---------- | --------------------------------------------------- |
| [Lucide](https://lucide.dev/)                                    | ISC        | `solarizedDarkTheme`, `solarizedLightTheme`         |
| [Phosphor Icons](https://phosphoricons.com/)                     | MIT        | `draculaTheme` (Duotone), `tokyoNightTheme` (Light) |
| [Pixelarticons](https://pixelarticons.com/)                      | MIT        | `monokaiTheme`                                      |
| [MingCute](https://github.com/Richard9394/MingCute)              | Apache-2.0 | `candyWrapperTheme`                                 |
| [Octicons](https://github.com/primer/octicons)                   | MIT        | `githubDarkTheme`, `githubLightTheme`               |
| [Solar](https://icon-sets.iconify.design/solar/) (by 480 Design) | CC BY 4.0  | `psychedelicTheme`                                  |


## License

MIT

Theme code is MIT-licensed. Bundled icon glyphs remain under their respective licenses listed under [Icon set credits](#icon-set-credits) above.
