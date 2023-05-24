const defaultTheme: DefaultTheme = {
  displayName: 'Default',
  fragments: { edit: 'rgb(42, 161, 152)' },
  styles: {
    container: {
      backgroundColor: '#f6f6f6',
      fontFamily: 'monospace',
    },
    property: '#292929',
    bracket: { color: 'rgb(0, 43, 54)', fontWeight: 'bold' },
    bracketContent: { color: 'rgba(0, 0, 0, 0.3)', fontStyle: 'italic' },
    string: 'rgb(203, 75, 22)',
    number: 'rgb(38, 139, 210)',
    boolean: 'green',
    null: { color: 'rgb(220, 50, 47)', fontVariant: 'small-caps', fontWeight: 'bold' },
    input: ['#292929', { fontSize: '90%' }],
    inputHighlight: '#b3d8ff',
    error: { fontSize: '0.8em', color: 'red', fontWeight: 'bold' },
    iconCollection: 'rgb(0, 43, 54)',
    iconEdit: 'edit',
    iconDelete: 'rgb(203, 75, 22)',
    iconAdd: 'edit',
    iconCopy: 'rgb(38, 139, 210)',
    iconOk: 'green',
    iconCancel: 'rgb(203, 75, 22)',
  },
}

export const themes: { default: DefaultTheme } & Record<string, Theme> = {
  default: defaultTheme,
  githubDark: {
    displayName: 'Github Dark',
    styles: {
      container: {
        backgroundColor: '#0d1117',
        color: 'white',
      },
      property: '#E6EDF3',
      bracket: '#56d364',
      bracketContent: '#8B949E',
      string: '#A5D6FF',
      number: '#D2A8FF',
      boolean: { color: '#FF7B72', fontSize: '90%', fontWeight: 'bold' },
      null: 'green',
      iconCollection: '#D2A8FF',
      iconEdit: '#D2A8FF',
      iconDelete: 'rgb(203, 75, 22)',
      iconAdd: 'rgb(203, 75, 22)',
      iconCopy: '#A5D6FF',
      iconOk: '#56d364',
      iconCancel: 'rgb(203, 75, 22)',
    },
  },
  githubLight: {
    displayName: 'Github Light',
    styles: {
      container: 'white',
      property: '#1F2328',
      bracket: '#00802e',
      bracketContent: '#8B949E',
      string: '#0A3069',
      number: '#953800',
      boolean: { color: '#CF222E', fontSize: '90%', fontWeight: 'bold' },
      null: '#FF7B72',
      iconCollection: '#8250DF',
      iconEdit: '#8250DF',
      iconDelete: 'rgb(203, 75, 22)',
      iconAdd: '#8250DF',
      iconCopy: '#57606A',
    },
  },
  monoDark: {
    displayName: 'Black & White',
    fragments: {
      lightText: { color: 'white' },
      midGrey: '#5c5c5c',
    },
    styles: {
      container: ['lightText', { backgroundColor: 'black' }],
      property: 'lightText',
      bracket: 'midGrey',
      bracketContent: '#4a4a4a',
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
  },
  monoLight: {
    fragments: { midGrey: '#a3a3a3' },
    displayName: 'White & Black',
    styles: {
      container: 'white',
      property: 'black',
      bracket: 'midGrey',
      bracketContent: '#b5b5b5',
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
  },
  candyWrapper: {
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
      bracket: 'dark',
      bracketContent: 'pale',
      string: 'mid',
      number: ['darkBlue', { fontSize: '85%' }],
      boolean: ['mid', { fontStyle: 'italic', fontWeight: 'bold', fontSize: '80%' }],
      null: ['#cccccc', { fontWeight: 'bold' }],
      iconCollection: '#1D3557',
      iconEdit: '#457B9D',
      iconDelete: '#E63946',
      iconAdd: '#2B2D42',
      iconCopy: '#1D3557',
      iconCancel: '#E63946',
    },
  },
}

export const emptyStyleObject: CompiledStyles = {
  container: {},
  property: {},
  bracket: {},
  bracketContent: {},
  string: {},
  number: {},
  boolean: {},
  null: {},
  input: {},
  inputHighlight: {},
  error: {},
  iconCollection: {},
  iconEdit: {},
  iconDelete: {},
  iconAdd: {},
  iconCopy: {},
  iconOk: {},
  iconCancel: {},
}

/**
 * TYPE DEFINITIONS
 */

const themeableElements = [
  'container',
  'property',
  'bracket',
  'bracketContent',
  'string',
  'number',
  'boolean',
  'null',
  'input',
  'inputHighlight',
  'error',
  'iconCollection',
  'iconEdit',
  'iconDelete',
  'iconAdd',
  'iconCopy',
  'iconOk',
  'iconCancel',
] as const

export type ThemeableElement = (typeof themeableElements)[number]

export type ThemeValue = string | React.CSSProperties | Array<string | React.CSSProperties> // e.g. "#FFFFF", {backgroundColor: "grey"}, ["smaller", {fontWeight: "bold"}]

export type ThemeStyles = Record<ThemeableElement, ThemeValue>

type Fragments = Record<string, React.CSSProperties | string>
export interface Theme {
  displayName?: string
  fragments?: Fragments
  styles: Partial<ThemeStyles>
}

// Same as "Theme", but we know every property in styles is defined
export interface DefaultTheme extends Theme {
  displayName: 'Default'
  styles: ThemeStyles
}

// All the fragments and shorthand defined in Theme is compiled into a single CSS
// "Style" object before being passed to components
export type CompiledStyles = Record<ThemeableElement, React.CSSProperties>

export type ThemeName = keyof typeof themes

// Value(s) passed to "setTheme" method
export type ThemeInput =
  | ThemeName
  | Theme
  | Partial<ThemeStyles>
  | [ThemeName, Theme | Partial<ThemeStyles>]
