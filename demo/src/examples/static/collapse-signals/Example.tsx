import { useCallback, useState } from 'react'
import { JsonEditor, type JsonData, type OnCollapseFunction } from '@json-edit-react'
import { useEditorDefaults, useToast } from '@example-resources'

// A deliberately deep, narrow document, so a single collapse
// near the top can fold a whole subtree at once.
const initialData = {
  documents: {
    work: {
      reports: ['Q1.pdf', 'Q2.pdf'],
    },
  },
  photos: {
    vacation: {
      beach: ['sea.jpg', 'sand.jpg'],
    },
  },
}

export default function CollapseSignals() {
  const [data, setData] = useState<JsonData>(initialData)
  const toast = useToast()

  // Every open/collapse fires onCollapse with the node's `path`,
  // whether it just `collapsed` (vs expanded), and whether the
  // action reached all descendants (`includeChildren`). Click a
  // node's collapse arrow to fold just that node; hold the
  // modifier key (Alt / Option by default) while clicking to
  // fold its whole subtree — watch includeChildren flip to true.
  const onCollapse = useCallback<OnCollapseFunction>(
    ({ path, collapsed, includeChildren }) => {
      const where = path.length ? path.join(' › ') : '(root)'
      toast({
        title: collapsed ? 'Collapsed' : 'Expanded',
        description: `${where} — includeChildren: ${includeChildren}`,
        status: collapsed ? 'warning' : 'success',
        duration: 2500,
        isClosable: true,
        position: 'top-right',
        variant: 'left-accent',
      })
    },
    [toast]
  )

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useEditorDefaults()}
      rootName="files"
      onCollapse={onCollapse}
      // Start fully closed
      collapse={true}
    />
  )
}
