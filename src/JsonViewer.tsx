import React, { useImperativeHandle, useRef } from 'react'
import { JsonEditor } from './JsonEditor'
import { NOOP } from './utils/misc'
import { type JsonData, type JsonEditorHandle, type JsonViewerProps } from './types'

export function JsonViewer<T = JsonData>(props: JsonViewerProps<T>): React.ReactElement | null {
  const { editorRef, ...rest } = props

  // The viewer holds a PRIVATE handle to the underlying editor and exposes only
  // `collapse` to its consumer. Editing actions supersede `allowEdit` by
  // design, so surfacing `startEdit`/`confirm` here would let a consumer
  // bypass the read-only contract through the ref. Keeping them on the private
  // `innerRef` makes them genuinely unreachable, not merely type-hidden.
  const innerRef = useRef<JsonEditorHandle>(null)
  useImperativeHandle(
    editorRef,
    () => ({ collapse: (state) => innerRef.current?.collapse(state) }),
    []
  )

  return (
    <JsonEditor<T>
      {...rest}
      editorRef={innerRef}
      setData={NOOP}
      allowEdit={false}
      allowAdd={false}
      allowDelete={false}
      allowDrag={false}
    />
  )
}
