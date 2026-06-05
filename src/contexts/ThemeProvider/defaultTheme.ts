import { type Theme } from './types'

export const defaultTheme: Theme = {
  displayName: 'Default',
  styles: {
    container: {
      backgroundColor: '#f6f6f6',
      fontFamily: 'monospace',
    },
    // collection: {},
    // collectionInner: {},
    // collectionElement: {},
    // dropZone: {},
    property: '#292929',
    bracket: { color: '#002b36', fontWeight: 'bold' },
    itemCount: { color: '#0000004d', fontStyle: 'italic' },
    string: '#cb4b16',
    number: '#268bd2',
    boolean: 'green',
    null: { color: '#dc322f', fontVariant: 'small-caps', fontWeight: 'bold' },
    input: ['#292929'],
    inputHighlight: '#b3d8ff',
    error: { fontSize: '0.8em', color: 'red', fontWeight: 'bold' },
    iconCollection: '#002b36',
    iconEdit: '#2aa198',
    iconDelete: '#cb4b16',
    iconAdd: '#2aa198',
    iconCopy: '#268bd2',
    iconOk: 'green',
    iconCancel: '#cb4b16',
  },
}
