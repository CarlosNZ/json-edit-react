/**
 * A reference CodeMirror-based text editor that satisfies the
 * `TextEditorProps` contract, so it can be passed to JsonEditor's
 * `TextEditor` prop to replace the default plain <textarea> when editing
 * a JSON subtree as raw text.
 *
 * CodeMirror and its theme packages are loaded lazily — they're external in
 * rollup, so the dynamic imports below become runtime `import()` calls and
 * only land in the consumer's bundle when the editor actually opens. The
 * optional `theme` prop maps a JsonEditor theme display name to a matching
 * CodeMirror Extension.
 */

import React, { lazy, Suspense } from 'react'
import { type TextEditorProps } from 'json-edit-react'
import { type Extension } from '@uiw/react-codemirror'
import { Loading } from '../_common/Loading'

type Props = TextEditorProps & { theme?: string }

const InnerEditor = lazy(async () => {
  const [cm, lang, gh, consoleD, consoleL, ql, mk, dr, sl, tn] = await Promise.all([
    import('@uiw/react-codemirror'),
    import('@codemirror/lang-json'),
    import('@uiw/codemirror-theme-github'),
    import('@uiw/codemirror-theme-console/dark'),
    import('@uiw/codemirror-theme-console/light'),
    import('@uiw/codemirror-theme-quietlight'),
    import('@uiw/codemirror-theme-monokai'),
    import('@uiw/codemirror-theme-dracula'),
    import('@uiw/codemirror-theme-solarized'),
    import('@uiw/codemirror-theme-tokyo-night'),
  ])

  const CodeMirror = cm.default
  const themeMap: Record<string, Extension | undefined> = {
    Default: undefined,
    'Github Light': gh.githubLight,
    'Github Dark': gh.githubDark,
    'White & Black': consoleL.consoleLight,
    'Black & White': consoleD.consoleDark,
    'Candy Wrapper': ql.quietlight,
    Psychedelic: mk.monokai,
    Dracula: dr.dracula,
    Monokai: mk.monokai,
    'Solarized Light': sl.solarizedLight,
    'Solarized Dark': sl.solarizedDark,
    'Tokyo Night': tn.tokyoNight,
  }

  const Impl: React.FC<Props> = ({ value, onChange, onKeyDown, theme }) => (
    <CodeMirror
      theme={theme ? themeMap[theme] : undefined}
      value={value}
      width="100%"
      extensions={[lang.json()]}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  )

  return { default: Impl }
})

export const CodeEditor: React.FC<Props> = (props) => (
  <Suspense fallback={<Loading text="Loading editor" />}>
    <InnerEditor {...props} />
  </Suspense>
)
