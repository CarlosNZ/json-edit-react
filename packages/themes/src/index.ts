import { type Theme } from 'json-edit-react'

export const githubDarkTheme: Theme = {
  displayName: 'Github Dark',
  fragments: { purple: '#D2A8FF', skyBlue: '#A5D6FF', lime: '#56d364', orange: 'rgb(203, 75, 22)' },
  styles: {
    container: { backgroundColor: '#0d1117', color: 'white' },
    dropZone: 'rgba(165, 214, 255, 0.17)',
    property: '#E6EDF3',
    bracket: 'lime',
    itemCount: '#8B949E',
    string: 'skyBlue',
    number: 'purple',
    boolean: { color: '#FF7B72', fontSize: '90%', fontWeight: 'bold' },
    null: 'green',
    iconCollection: 'purple',
    iconEdit: 'purple',
    iconDelete: 'orange',
    iconAdd: 'orange',
    iconCopy: 'skyBlue',
    iconOk: 'lime',
    iconCancel: 'orange',
  },
}

export const githubLightTheme: Theme = {
  displayName: 'Github Light',
  fragments: { purple: '#8250DF' },
  styles: {
    container: 'white',
    property: '#1F2328',
    bracket: '#00802e',
    itemCount: '#8B949E',
    string: '#0A3069',
    number: '#953800',
    boolean: { color: '#CF222E', fontSize: '90%', fontWeight: 'bold' },
    null: '#FF7B72',
    iconCollection: 'purple',
    iconEdit: 'purple',
    iconDelete: 'rgb(203, 75, 22)',
    iconAdd: 'purple',
    iconCopy: '#57606A',
  },
}

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
  },
}

export const candyWrapperTheme: Theme = {
  displayName: 'Candy Wrapper',
  fragments: {
    minty: { backgroundColor: '#F1FAEE' },
    pale: { color: '#A8DADC' },
    mid: { color: '#457B9D' },
    dark: { color: '#1D3557' },
    pop: { color: '#E63946' },
    darkBlue: { color: '#2B2D42' },
  },
  styles: {
    container: 'minty',
    property: 'pop',
    dropZone: '#eb121217',
    bracket: 'dark',
    itemCount: 'pale',
    string: 'mid',
    number: ['darkBlue', { fontSize: '85%' }],
    boolean: ['mid', { fontStyle: 'italic', fontWeight: 'bold', fontSize: '80%' }],
    null: { color: '#cccccc', fontWeight: 'bold' },
    input: { border: '1px solid rgb(115, 194, 198)' },
    iconCollection: 'dark',
    iconEdit: 'mid',
    iconDelete: 'pop',
    iconAdd: 'darkBlue',
    iconCopy: 'dark',
    iconCancel: 'pop',
  },
}

export const psychedelicTheme: Theme = {
  displayName: 'Psychedelic',
  fragments: {
    fluroYellow: 'rgb(242, 228, 21)',
    fluroGreen: 'rgb(68, 255, 62)',
  },
  styles: {
    container: {
      backgroundColor: 'unset',
      background: 'linear-gradient(90deg, hsla(333, 100%, 53%, 1) 0%, hsla(33, 94%, 57%, 1) 100%)',
      color: 'black',
    },
    dropZone: 'fluroYellow',
    property: 'black',
    bracket: 'fluroYellow',
    itemCount: { color: '#A8DADC', opacity: 0.7 },
    string: 'white',
    number: { color: '#33d9ff', fontSize: '90%', fontWeight: 'bold' },
    boolean: ['fluroGreen', { fontWeight: 'bold', fontSize: '80%' }],
    null: {
      color: 'black',
      fontWeight: 'bold',
      opacity: 0.3,
      backgroundColor: 'rgb(255, 255, 255, 0.5)',
      padding: '0 0.4em',
      borderRadius: '0.4em',
    },
    iconCollection: 'fluroYellow',
    iconEdit: 'black',
    iconDelete: { color: 'white', opacity: 0.5 },
    iconAdd: { color: 'white', opacity: 0.5 },
    iconCopy: 'rgb(32, 84, 242)',
    iconOk: 'fluroGreen',
    iconCancel: '#f7379a',
  },
}

export const solarizedDarkTheme: Theme = {
  displayName: 'Solarized Dark',
  fragments: { green: '#859900', red: '#dc322f', blue: '#268bd2' },
  styles: {
    container: { color: '#839496', backgroundColor: '#002b36' },
    dropZone: 'rgba(38, 139, 210, 0.15)',
    property: '#93a1a1',
    bracket: 'green',
    itemCount: '#586e75',
    string: '#2aa198',
    number: { color: '#d33682', fontSize: '95%' },
    boolean: { color: '#cb4b16', fontWeight: 'bold', fontSize: '90%' },
    null: ['red', { fontWeight: 'bold' }],
    input: { border: '1px solid #586e75' },
    iconCollection: 'blue',
    iconEdit: 'blue',
    iconDelete: 'red',
    iconAdd: 'green',
    iconCopy: '#6c71c4',
    iconOk: 'green',
    iconCancel: 'red',
  },
}

export const solarizedLightTheme: Theme = {
  displayName: 'Solarized Light',
  fragments: { green: '#859900', red: '#dc322f', blue: '#268bd2' },
  styles: {
    container: { color: '#657b83', backgroundColor: '#fdf6e3' },
    dropZone: 'rgba(38, 139, 210, 0.15)',
    property: '#586e75',
    bracket: 'green',
    itemCount: '#93a1a1',
    string: '#2aa198',
    number: { color: '#d33682', fontSize: '95%' },
    boolean: { color: '#cb4b16', fontWeight: 'bold', fontSize: '90%' },
    null: ['red', { fontWeight: 'bold' }],
    input: { border: '1px solid #93a1a1' },
    iconCollection: 'blue',
    iconEdit: 'blue',
    iconDelete: 'red',
    iconAdd: 'green',
    iconCopy: '#6c71c4',
    iconOk: 'green',
    iconCancel: 'red',
  },
}

export const draculaTheme: Theme = {
  displayName: 'Dracula',
  fragments: { cyan: '#8be9fd', red: '#ff5555', green: '#50fa7b' },
  styles: {
    container: { color: '#f8f8f2', backgroundColor: '#282a36' },
    dropZone: 'rgba(139, 233, 253, 0.15)',
    property: '#f8f8f2',
    bracket: 'green',
    itemCount: '#6272a4',
    string: '#f1fa8c',
    number: { color: '#bd93f9', fontSize: '95%' },
    boolean: { color: '#ff79c6', fontWeight: 'bold', fontSize: '90%' },
    null: ['red', { fontWeight: 'bold' }],
    input: { border: '1px solid #6272a4' },
    iconCollection: 'cyan',
    iconEdit: 'cyan',
    iconDelete: 'red',
    iconAdd: 'green',
    iconCopy: '#ffb86c',
    iconOk: 'green',
    iconCancel: 'red',
  },
}

export const monokaiTheme: Theme = {
  displayName: 'Monokai',
  fragments: { green: '#a6e22e', pink: '#f92672', cyan: '#66d9ef', orange: '#fd971f' },
  styles: {
    container: { color: '#f8f8f2', backgroundColor: '#272822' },
    dropZone: 'rgba(166, 226, 46, 0.15)',
    property: 'green',
    bracket: '#f8f8f2',
    itemCount: '#75715e',
    string: '#e6db74',
    number: { color: '#ae81ff', fontSize: '95%' },
    boolean: ['orange', { fontWeight: 'bold', fontSize: '90%' }],
    null: ['pink', { fontWeight: 'bold' }],
    input: { border: '1px solid #75715e' },
    iconCollection: 'cyan',
    iconEdit: 'cyan',
    iconDelete: 'pink',
    iconAdd: 'green',
    iconCopy: 'orange',
    iconOk: 'green',
    iconCancel: 'pink',
  },
}

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
      background: 'linear-gradient(160deg, #FFFDFB 0%, #F3ECE4 100%)',
      color: '#2F3D45',
      fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
      borderRadius: '0.55em',
      border: '1px solid #E7DDD2',
      boxShadow: '0 2px 16px rgba(47, 61, 69, 0.1)',
      padding: '0.6em 0.7em',
    },
    dropZone: 'rgba(242, 101, 50, 0.14)',
    property: ['charcoal', { fontWeight: 600 }],
    bracket: ['teal', { fontWeight: 'bold' }],
    itemCount: { color: '#A8998A', fontStyle: 'italic', opacity: 0.85 },
    string: 'coral',
    number: ['red', { fontSize: '95%' }],
    boolean: ['gold', { fontWeight: 'bold', fontSize: '90%' }],
    null: { color: '#A8998A', fontVariant: 'small-caps', fontWeight: 'bold' },
    input: {
      color: '#2F3D45',
      backgroundColor: '#FFFFFF',
      border: '1px solid #DFD4C7',
      borderRadius: '0.3em',
    },
    inputHighlight: 'rgba(242, 101, 50, 0.22)',
    error: { fontSize: '0.8em', color: '#C60023', fontWeight: 'bold' },
    iconCollection: 'charcoal',
    iconEdit: 'teal',
    iconDelete: 'red',
    iconAdd: 'coral',
    iconCopy: '#78909D',
    iconOk: 'teal',
    iconCancel: 'taupe',
  },
}

export const tokyoNightTheme: Theme = {
  displayName: 'Tokyo Night',
  fragments: { purple: '#bb9af7', pink: '#f7768e', green: '#9ece6a' },
  styles: {
    container: { color: '#a9b1d6', backgroundColor: '#1a1b26' },
    dropZone: 'rgba(122, 162, 247, 0.18)',
    property: '#c0caf5',
    bracket: '#7aa2f7',
    itemCount: '#565f89',
    string: 'green',
    number: { color: '#ff9e64', fontSize: '95%' },
    boolean: ['pink', { fontWeight: 'bold', fontSize: '90%' }],
    null: { color: '#565f89', fontWeight: 'bold' },
    input: { border: '1px solid #565f89' },
    iconCollection: 'purple',
    iconEdit: 'purple',
    iconDelete: 'pink',
    iconAdd: 'green',
    iconCopy: '#7dcfff',
    iconOk: 'green',
    iconCancel: 'pink',
  },
}
