import { useState } from 'react'
import { JsonEditor, type JsonData } from '@json-edit-react'
import { errorIndicatorDefinition } from '@json-edit-react/components'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

// "Decorating the default node" — wrap the library's own
// rendering instead of replacing it. `passOriginalNode` hands
// the component the node exactly as the library drew it, and it
// renders that plus an extra. The pre-built ErrorIndicator does
// just this: it appends a ⚠️ to whatever it decorates.
//
// A team's scores should all be numbers, but ~1/3 arrive as
// strings ("50" instead of 50). The definition's `condition`
// flags those string values, so each gets a warning marker. Fix
// one by switching it to the "number" type (the type selector,
// while editing): the value carries over and the marker clears.
//
// Scores are random on each load — a normal distribution
// (MEAN / STD_DEV) clamped to 1–100.

const MEAN = 65
const STD_DEV = 15
// About this fraction arrive as strings — the "invalid" nodes.
const INVALID_RATIO = 1 / 3

const NAMES = ['Ava', 'Ben', 'Chloe', 'Diego', 'Emma', 'Finn', 'Grace', 'Hugo', 'Isla', 'Jack']

// Box–Muller transform: two uniform randoms → one sample from a
// normal distribution with the given mean and std deviation.
const gaussian = (mean: number, stdDev: number) => {
  const u = 1 - Math.random()
  const v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * stdDev + mean
}

// One score per person: a clamped, rounded gaussian, with about
// INVALID_RATIO of them degraded to strings.
const generateScores = (): JsonData =>
  Object.fromEntries(
    NAMES.map((name) => {
      const score = Math.min(100, Math.max(1, Math.round(gaussian(MEAN, STD_DEV))))
      return [name, Math.random() < INVALID_RATIO ? String(score) : score]
    })
  )

// Flag string-valued scores. ErrorIndicator's built-in guard
// already limits this to value (leaf) nodes, so the `scores`
// object itself is never marked — only its entries.
const customNodeDefinitions = [
  errorIndicatorDefinition({ condition: ({ value }) => typeof value === 'string' }),
]

export default function DecoratingNodes() {
  const [data, setData] = useState<JsonData>(generateScores)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useExampleProps()} // ---cut---
      rootName="scores"
      customNodeDefinitions={customNodeDefinitions}
    />
  )
}
