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

// Open mSupply / mSupply Foundation house palette: a warm sand canvas,
// charcoal-slate ink and the signature coral-orange accent, with a muted
// teal secondary and a deep brand red. Palette sampled from
// msupply.foundation/open-msupply.
export const tmfTheme: Theme = {
  displayName: 'TMF',
  fragments: {
    coral: '#F26532', // primary brand accent
    charcoal: '#2F3D45', // ink / headings
    teal: '#3F7E83', // muted secondary
    gold: '#B07A00', // legible take on the brand gold (#FEC503)
    red: '#C60023', // deep brand red
    taupe: '#A8998A', // warm neutral
  },
  styles: {
    container: {
      // Warm-sand card with the brand's soft, professional feel.
      background: '#fafafc',
      color: '#2F3D45',
      fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
      // borderRadius: '0.55em',
      // border: '1px solid #E7DDD2',
      // boxShadow: '0 2px 16px rgba(47, 61, 69, 0.1)',
    },
    collection: [
      // 'white',
      // { boxShadow: '0 4px 8px 0 rgba(96, 97, 112, 0.16), 0 0 2px 0 rgba(40, 41, 61, 0.04)' },
    ],
    // valueRow: ['white', { border: '1px solid black' }],
    dropZone: 'rgba(242, 101, 50, 0.14)',
    property: ['rgb(233, 92, 48)', { fontWeight: 600 }],
    bracket: ['rgb(62, 123, 250)', { fontWeight: 'bold' }],
    itemCount: { color: 'rgb(143, 144, 166)', fontStyle: 'italic', opacity: 0.85 },
    string: 'rgba(0, 0, 0, 0.87)',
    number: ['rgb(62, 123, 250)', { fontSize: '95%' }],
    boolean: ['#c43c11', { fontWeight: 'bold', fontSize: '90%' }],
    null: {
      color: '#ed7d59',
      // fontVariant: 'small-caps',
      fontWeight: 'bold',
    },
    input: {
      color: '#2F3D45',
      backgroundColor: '#FFFFFF',
      border: '1px solid #DFD4C7',
      borderRadius: '0.3em',
    },
    inputHighlight: 'rgba(242, 101, 50, 0.22)',
    error: { fontSize: '0.8em', color: '#C60023', fontWeight: 'bold' },
    iconCollection: '#3568d4',
    iconEdit: 'teal',
    iconDelete: 'red',
    iconAdd: 'coral',
    iconCopy: {},
    iconOk: 'teal',
    iconCancel: 'taupe',
  },
}
