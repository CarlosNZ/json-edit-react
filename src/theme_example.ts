const themeElements = [
  'container',
  'property',
  'bracket',
  'bracketContent',
  'string',
  'number',
  'boolean',
  'null',
  'input',
  'iconCollection',
  'iconEdit',
  'iconDelete',
  'iconAdd',
  'iconCopy',
  'iconOk',
  'iconCancel',
] as const

export type ThemeElement = (typeof themeElements)[number]
type ThemeElementValue = string | React.CSSProperties | Array<string | React.CSSProperties>

type Snippets = Record<string, React.CSSProperties>
type ThemeElements = Record<ThemeElement, ThemeElementValue>

interface Theme {
  name: string
  snippets?: Snippets
  style: Partial<ThemeElements>
}

interface FullTheme extends Theme {
  style: ThemeElements
}

const theme: Theme = {
  name: 'My Theme',
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
}

const defaultTheme: FullTheme = {
  name: 'Default',
  style: {
    container: {
      backgroundColor: '#f6f6f6',
      color: '#292929',
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
