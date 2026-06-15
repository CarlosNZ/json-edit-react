import { useMemo, useState } from 'react'
import {
  JsonEditor,
  standardDataTypes,
  type SelectProps,
  type TypeOptions,
} from '@json-edit-react'
import { CodeEditor, ReactSelect } from '@json-edit-react/components'
import { buildSelectStyles } from './utils'
import { useExampleTheme } from '../../kit/exampleProps'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---
import { useExamplePalette } from '../../kit/useThemePalette' // ---cut---

const initialData = {
  task: {
    title: 'Add custom dropdown support',
    status: 'in-progress',
    priority: 'high',
    assignee: 'Carl',
  },
  notes: 'Feature request from issue #226',
}

// Suggestions shown when adding a new key on the `task` object. Drives the
// "new-key" dropdown — one of the three places `Select` renders.
const newKeyOptions = ['dueDate', 'tags', 'estimate', 'reviewer']

// Standard data types plus two enums. Existing values like 'in-progress' and
// 'high' are auto-matched to their enum type by content (`matchPriority`); the
// type selector also lets you switch any value to a different enum or back to
// a primitive — exercising the other two `Select` call sites.
const allowTypeSelection: TypeOptions = [
  ...standardDataTypes,
  { enum: 'Status', values: ['todo', 'in-progress', 'review', 'done'], matchPriority: 1 },
  { enum: 'Priority', values: ['low', 'medium', 'high', 'urgent'], matchPriority: 1 },
]

const StyledReactSelect = (props: SelectProps) => {
  const palette = useExamplePalette()
  const styles = useMemo(() => buildSelectStyles(palette), [palette])
  return <ReactSelect {...props} reactSelectProps={{ styles }} />
}

export default function SwapTheBuiltIns() {
  const [data, setData] = useState(initialData)
  const themeName = useExampleTheme().displayName

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useExampleProps()} // ---cut---
      rootName="project"
      newKeyOptions={newKeyOptions}
      allowTypeSelection={allowTypeSelection}
      Select={StyledReactSelect}
      TextEditor={(props) => <CodeEditor {...props} theme={themeName} />}
    />
  )
}
