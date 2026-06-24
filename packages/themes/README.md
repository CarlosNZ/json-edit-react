# @json-edit-react/themes

Pre-built themes for **[json-edit-react](https://github.com/CarlosNZ/json-edit-react)**.

> [!IMPORTANT]
> Requires **json-edit-react** version 2.x

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

;<JsonEditor data={data} setData={setData} theme={githubDarkTheme} />
```

## Available themes

| Name            | Import                |
| --------------- | --------------------- |
| Github Light    | `githubLightTheme`    |
| Github Dark     | `githubDarkTheme`     |
| White & Black   | `monoLightTheme`      |
| Black & White   | `monoDarkTheme`       |
| Candy Wrapper   | `candyWrapperTheme`   |
| Psychedelic     | `psychedelicTheme`    |
| Solarized Light | `solarizedLightTheme` |
| Solarized Dark  | `solarizedDarkTheme`  |
| Dracula         | `draculaTheme`        |
| Monokai         | `monokaiTheme`        |
| Tokyo Night     | `tokyoNightTheme`     |
| r18jv           | `r18jvTheme`          |
| TMF             | `tmfTheme`            |

Preview them all at the [**json-edit-react** demo](https://carlosnz.github.io/json-edit-react/)

## Theme credits

Several themes adapt established colour schemes. The palettes belong to their original authors; all credit goes to them.

| Colour scheme                                                    | Author                              | License | Theme(s)                                    |
| ---------------------------------------------------------------- | ----------------------------------- | ------- | ------------------------------------------- |
| [Solarized](https://ethanschoonover.com/solarized)               | Ethan Schoonover                    | MIT     | `solarizedLightTheme`, `solarizedDarkTheme` |
| [Dracula](https://draculatheme.com)                              | Zeno Rocha & the Dracula Theme team | MIT     | `draculaTheme`                              |
| [Tokyo Night](https://github.com/enkia/tokyo-night-vscode-theme) | enkia                               | MIT     | `tokyoNightTheme`                           |
| Monokai                                                          | Wimer Hazenberg                     | —       | `monokaiTheme`                              |

`monokaiTheme` adapts the palette of the original Monokai colour scheme; it has no affiliation with the commercial Monokai Pro.

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

Theme code is MIT-licensed. Adapted colour palettes are credited under [Theme credits](#theme-credits), and bundled icon glyphs remain under their respective licenses listed under [Icon set credits](#icon-set-credits) above.
