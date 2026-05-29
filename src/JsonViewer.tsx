import React from 'react'
import { JsonEditor } from './JsonEditor'
import { type JsonData, type JsonViewerProps } from './types'

const NOOP = () => {}

export function JsonViewer<T = JsonData>(props: JsonViewerProps<T>): React.ReactElement | null {
  return (
    <JsonEditor<T>
      {...props}
      setData={NOOP}
      restrictEdit
      restrictAdd
      restrictDelete
      restrictDrag
    />
  )
}
