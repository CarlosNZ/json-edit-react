import { useMemo, useState } from 'react'
import {
  JsonEditor,
  assign,
  type AssignInput,
  type CustomButtonDefinition,
  type NodeData,
} from '@json-edit-react'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

const initialData = {
  title: 'Weekend reading list',
  articles: [
    {
      title: 'Designing Data-Intensive Applications',
      url: 'https://dataintensive.net',
      tags: ['databases', 'distributed-systems'],
      read: false,
    },
    {
      title: 'You Might Not Need an Effect',
      url: 'https://react.dev/learn/you-might-not-need-an-effect',
      tags: ['react'],
      read: true,
    },
  ],
}

// A custom button's `Element` renders for *every* node, so return `null` to
// hide it where it doesn't apply — here, only on string values that look like a
// URL. It receives the same `nodeData` as the update callbacks.
const OpenLinkButton = ({ nodeData }: { nodeData: NodeData }) => {
  const { value } = nodeData
  if (typeof value !== 'string' || !/^https?:\/\//.test(value)) return null
  // Match the built-in buttons' size (1.4em) and render a bare inline <svg>
  // like they do, so it lines up vertically alongside them. The `jer-icon`
  // class gives the same hover scale/fade as the core buttons. The <title>
  // gives a hover tooltip; `currentColor` inherits the theme's text colour.
  return (
    <svg
      className="jer-icon"
      viewBox="0 0 24 24"
      width="1.4em"
      height="1.4em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Open link in new tab</title>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

// Shown on any array element (its key is its numeric index). Lets you clone a
// whole article object, or a single tag string, with one click.
const DuplicateButton = ({ nodeData }: { nodeData: NodeData }) => {
  if (typeof nodeData.key !== 'number') return null
  // The copy glyph fills more of its 24×24 box than the link icon, so a
  // slightly smaller size (1.25em) makes the two read as the same visual
  // weight. Artwork spans 2–22 on both axes — centred in the viewBox.
  return (
    <svg
      className="jer-icon"
      viewBox="0 0 24 24"
      width="1.25em"
      height="1.25em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Duplicate this item</title>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

export default function CustomButtons() {
  const [data, setData] = useState(initialData)

  // `setData` is referentially stable, so the array is built once. Custom
  // buttons feed into every node's props, so a stable reference keeps the
  // tree's fine-grained re-rendering intact.
  const customButtons = useMemo<CustomButtonDefinition[]>(
    () => [
      {
        Element: OpenLinkButton,
        onClick: (nodeData) => {
          window.open(nodeData.value as string, '_blank', 'noopener,noreferrer')
        },
      },
      {
        Element: DuplicateButton,
        onClick: (nodeData) => {
          const index = nodeData.key as number
          // `assign` is json-edit-react's own immutable setter; `insert: true`
          // splices `clone` into the parent array at the target index, leaving
          // the original right before it.
          const insertPath = [...nodeData.path.slice(0, -1), index + 1]
          const clone = structuredClone(nodeData.value)
          setData(
            (current) =>
              assign(current as AssignInput, insertPath, clone, { insert: true }) as typeof data
          )
        },
      },
    ],
    []
  )

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useExampleProps()} // ---cut---
      rootName="readingList"
      customButtons={customButtons}
      collapse={4}
    />
  )
}
