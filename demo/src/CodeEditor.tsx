import React from 'react'
import CodeMirror, { Extension } from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { TextEditorProps } from './imports'
import { githubLight, githubDark } from '@uiw/codemirror-theme-github'
import { consoleDark } from '@uiw/codemirror-theme-console/dark'
import { consoleLight } from '@uiw/codemirror-theme-console/light'
import { quietlight } from '@uiw/codemirror-theme-quietlight'
import { monokai } from '@uiw/codemirror-theme-monokai'

const themeMap: Record<string, Extension | undefined> = {
  Default: undefined,
  'Github Light': githubLight,
  'Github Dark': githubDark,
  'White & Black': consoleLight,
  'Black & White': consoleDark,
  'Candy Wrapper': quietlight,
  Psychedelic: monokai,
}

// Styles defined in /demo/src/style.css

const CodeEditor: React.FC<TextEditorProps & { theme: string }> = ({
  value,
  onChange,
  onKeyDown,
  theme,
}) => {
  return (
    <CodeMirror
      theme={themeMap?.[theme]}
      value={value}
      width="100%"
      extensions={[json()]}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  )
}

export default CodeEditor
