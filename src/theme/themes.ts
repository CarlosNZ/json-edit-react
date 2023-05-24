import { BaseTheme, CompiledStyles, Theme } from './ThemeProvider'

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
  // highlightColor: '#b3d8ff',
  iconCollection: {},
  iconEdit: {},
  iconDelete: {},
  iconAdd: {},
  iconCopy: {},
  iconOk: {},
  iconCancel: {},
}

const defaultTheme: BaseTheme = {
  displayName: 'Default',
  style: {
    container: {
      backgroundColor: '#f6f6f6',
      //   color: '#292929',
      fontFamily: 'monospace',
      borderColor: 'rgb(0, 0, 0, 0.2)',
    },
    property: '#1F2328',
    bracket: 'rgb(0, 43, 54)',
    bracketContent: 'rgba(0, 0, 0, 0.3)',
    string: 'rgb(203, 75, 22)',
    number: 'rgb(38, 139, 210)',
    boolean: 'green',
    null: 'rgb(220, 50, 47)',
    input: '#292929',
    // highlightColor: '#b3d8ff',
    iconCollection: 'rgb(0, 43, 54)',
    iconEdit: 'rgb(42, 161, 152)',
    iconDelete: 'rgb(203, 75, 22)',
    iconAdd: 'rgb(42, 161, 152)',
    iconCopy: 'rgb(38, 139, 210)',
    iconOk: 'green',
    iconCancel: 'rgb(203, 75, 22)',
  },
}

export const themes: Record<string, Theme> = {
  default: defaultTheme,
  githubDark: {
    displayName: 'Github Dark',
    style: {
      container: {
        backgroundColor: '#0d1117',
        // color: '#E6EDF3',
        fontFamily: 'monospace',
        borderColor: 'transparent',
      },
      property: '#E6EDF3',
      bracket: '#56d364',
      bracketContent: '#8B949E',
      string: '#A5D6FF',
      number: '#D2A8FF',
      boolean: '#FF7B72',
      null: '#FF7B72',
      input: '#292929',
      // highlightColor: '#b3d8ff',
      iconCollection: '#D2A8FF',
      iconEdit: '#D2A8FF',
      iconDelete: 'rgb(203, 75, 22)',
      iconAdd: 'rgb(203, 75, 22)',
      iconCopy: '#A5D6FF',
      iconOk: '#56d364',
      iconCancel: 'rgb(203, 75, 22)',
    },
  },
  test: {
    displayName: 'Test Theme',
    snippets: {
      main: { backgroundColor: 'grey', fontFamily: 'monospace' },
      text1: { color: 'green' },
      text2: { fontStyle: 'italic' },
      makeItRed: { color: 'red' },
    },
    style: {
      container: 'main',
      property: { color: 'black' },
      bracket: { fontWeight: 'bold' },
      string: 'text1',
      number: ['text2', 'text1', { backgroundColor: 'aquamarine' }],
      boolean: 'red',
    },
  },
}

export type ThemeName = keyof typeof themes
