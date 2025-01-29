import React from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { TextEditorProps } from './_imports'

const CodeEditor: React.FC<TextEditorProps> = ({ value, onChange, onKeyDown }) => {
  return (
    <CodeMirror
      value={value}
      width="100%"
      extensions={[json()]}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  )
}

export default CodeEditor
