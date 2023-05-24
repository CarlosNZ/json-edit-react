const defaultTheme: DefaultTheme = {
  displayName: 'Default',
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
    input: '#292929',
    inputHighlight: '#b3d8ff',
    iconCollection: 'rgb(0, 43, 54)',
    iconEdit: 'rgb(42, 161, 152)',
    iconDelete: 'rgb(203, 75, 22)',
    iconAdd: 'rgb(42, 161, 152)',
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
    snippets: {
      lightText: { color: 'white' },
    },
    styles: {
      container: ['lightText', { backgroundColor: 'black' }],
      property: 'lightText',
      bracket: '#5c5c5c',
      bracketContent: '#4a4a4a',
      string: '#a8a8a8',
      number: '#666666',
      boolean: { color: '#848484', fontStyle: 'italic' },
      null: '#333333',
      iconCollection: '5c5c5c',
      iconEdit: '5c5c5c',
      iconDelete: '5c5c5c',
      iconAdd: '5c5c5c',
      iconCopy: '5c5c5c',
      iconOk: '5c5c5c',
      iconCancel: '5c5c5c',
    },
  },
  monoLight: {
    displayName: 'White & Black',
    styles: {
      container: 'white',
      property: 'black',
      bracket: '#a3a3a3',
      bracketContent: '#b5b5b5',
      string: '#575757',
      number: '#999999',
      boolean: { color: '#7b7b7b', fontStyle: 'italic' },
      null: '#cccccc',
      iconCollection: 'a3a3a3',
      iconEdit: 'a3a3a3',
      iconDelete: 'a3a3a3',
      iconAdd: 'a3a3a3',
      iconCopy: 'a3a3a3',
      iconOk: 'a3a3a3',
      iconCancel: 'a3a3a3',
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
  'iconCollection',
  'iconEdit',
  'iconDelete',
  'iconAdd',
  'iconCopy',
  'iconOk',
  'iconCancel',
] as const

export type ThemeableElement = (typeof themeableElements)[number]

export type ThemeValue = string | React.CSSProperties | Array<string | React.CSSProperties>

export type ThemeElements = Record<ThemeableElement, ThemeValue>

type Snippets = Record<string, React.CSSProperties>
export interface Theme {
  displayName?: string
  snippets?: Snippets
  styles: Partial<ThemeElements>
}

export interface DefaultTheme extends Theme {
  displayName: 'Default'
  styles: ThemeElements
}

export type CompiledStyles = Record<ThemeableElement, React.CSSProperties>

type ThemeName = keyof typeof themes
export type ThemeInput =
  | ThemeName
  | Theme
  | Partial<ThemeElements>
  | [ThemeName, Theme | Partial<ThemeElements>]
