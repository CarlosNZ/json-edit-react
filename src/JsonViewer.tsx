import React from 'react'
import { JsonEditor } from './JsonEditor'
import { NOOP } from './helpers'
import { type JsonData, type JsonViewerProps } from './types'

export function JsonViewer<T = JsonData>(props: JsonViewerProps<T>): React.ReactElement | null {
  return (
    <JsonEditor<T>
      {...props}
      // externalTriggers bypasses the restrict filters (useTriggers sets
      // currentlyEditingElement directly), so force it off for JS consumers
      // who might pass it past the TS Omit
      externalTriggers={undefined}
      setData={NOOP}
      restrictEdit
      restrictAdd
      restrictDelete
      restrictDrag
    />
  )
}
