import { createContext, useContext } from 'react'
import { type JsonEditorProps } from '@json-edit-react'

// Standard editor props the shell injects into every example's JsonEditor —
// presentation concerns (theme, className, sizing, counts…) that the shell
// wants to control but which shouldn't clutter an example's copy-pasteable
// source. Examples spread `{...useExampleProps()}` onto their editor on a `//
// ---cut---` line, so these drive the live editor while staying out of the
// displayed code.
//
// Curated to non-generic props only, so the spread is safe onto a
// `JsonEditor<T>` of any data type. Add more here as needed.
export type ExampleEditorProps = Partial<
  Pick<
    JsonEditorProps,
    | 'theme'
    | 'className'
    | 'minWidth'
    | 'maxWidth'
    | 'showCollectionCount'
    | 'showArrayIndexes'
    | 'indent'
  >
>

export const ExampleEditorContext = createContext<ExampleEditorProps>({})

export const useExampleProps = (): ExampleEditorProps => useContext(ExampleEditorContext)
