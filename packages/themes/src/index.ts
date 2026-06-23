import { type Theme } from 'json-edit-react'

// GitHub themes carry Octicons (GitHub's own) icon glyphs — live in their own
// .tsx module.
export { githubDarkTheme, githubLightTheme } from './github'

export const monoDarkTheme: Theme = {
  displayName: 'Black & White',
  fragments: {
    lightText: { color: 'white' },
    midGrey: '#5c5c5c',
  },
  styles: {
    container: ['lightText', { backgroundColor: 'black' }],
    dropZone: '#e0e0e029',
    property: 'lightText',
    bracket: 'midGrey',
    itemCount: '#4a4a4a',
    string: '#a8a8a8',
    number: '#666666',
    boolean: { color: '#848484', fontStyle: 'italic' },
    null: '#333333',
    iconCollection: 'midGrey',
    iconEdit: 'midGrey',
    iconDelete: 'midGrey',
    iconAdd: 'midGrey',
    iconCopy: 'midGrey',
    iconOk: 'midGrey',
    iconCancel: 'midGrey',
    inputHighlight: '#dcdcdc',
  },
}

export const monoLightTheme: Theme = {
  displayName: 'White & Black',
  fragments: { midGrey: '#a3a3a3' },
  styles: {
    container: 'white',
    property: 'black',
    bracket: 'midGrey',
    itemCount: '#b5b5b5',
    string: '#575757',
    number: '#999999',
    boolean: { color: '#7b7b7b', fontStyle: 'italic' },
    null: '#cccccc',
    iconCollection: 'midGrey',
    iconEdit: 'midGrey',
    iconDelete: 'midGrey',
    iconAdd: 'midGrey',
    iconCopy: 'midGrey',
    iconOk: 'midGrey',
    iconCancel: 'midGrey',
    inputHighlight: '#dcdcdc',
  },
}

// Candy Wrapper carries MingCute icon glyphs — lives in its own .tsx module.
export { candyWrapperTheme } from './candyWrapper'

// Psychedelic carries Solar Bold icon glyphs — lives in its own .tsx module.
export { psychedelicTheme } from './psychedelic'

export { solarizedDarkTheme, solarizedLightTheme } from './solarized'

export { draculaTheme } from './dracula'

export { monokaiTheme } from './monokai'

export { tokyoNightTheme } from './tokyoNight'

export { r18jvTheme } from './r18jv'

// TMF carries medical-themed Phosphor Fill glyphs (with gradients) + custom
// ok/cancel buttons — lives in its own .tsx module.
export { tmfTheme } from './tmf'
