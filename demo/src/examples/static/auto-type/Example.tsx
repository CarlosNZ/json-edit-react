import { useState } from 'react'
import JSON5 from 'json5'
import { JsonEditor, type JsonData } from '@json-edit-react'
import { autoTypeDefinition } from '@json-edit-react/components'
import { useEditorDefaults } from '@example-resources'

// Every value is edited through a single text input — there's
// no Type selector. What you type decides the type, parsed
// with JSON5 (so unquoted keys, single quotes and trailing
// commas are all fine):
//
//   hello       → string
//   12.3        → number
//   true        → boolean
//   null        → null
//   {a: 1}      → object   (a leaf grows into a collection!)
//   [1, 2, 3,]  → array
//
// Anything that doesn't parse stays a string — "0077"
// included: leading zeros aren't valid number syntax, so the
// serial number stays text rather than turning into 77.
// Collections aren't matched, so they keep the built-in
// "Edit as JSON" editor (also JSON5 here); edit one down to a
// bare value and it becomes that primitive.
const initialData = {
  spacecraft: 'Voyager 1',
  launchYear: 1977,
  operational: true,
  distanceFromSunAU: 165.2,
  serialNumber: '0077', // looks numeric, but stays a string
  returnCrew: null,
  instruments: ['magnetometer', 'cosmic-ray detector', 'plasma-wave sensor'],
  power: {
    isotope: 'plutonium-238',
    outputWatts: 249,
    annualDecayPercent: 0.78,
    redundant: true,
  },
  trajectory: {
    velocityKmPerSec: 17,
    headingTowards: 'Ophiuchus',
    interstellar: true,
  },
  recentLog: [
    { date: '2012-08-25', event: 'crossed the heliopause' },
    { date: '2025-05-12', event: 'routine telemetry ping' },
  ],
  goldenRecord: {
    greetingLanguages: 55,
    includesEarthSounds: true,
    playbackInstructions: 'etched on the cover',
  },
}

// `autoTypeDefinition()` guards itself to value nodes and
// applies everywhere; `allowTypeSelection={false}` drops the
// now-redundant Type selector. `componentProps.jsonParse`
// makes the inline editor read relaxed JSON5; the matching
// editor-level `jsonParse` does the same for the collection
// "Edit as JSON" editor.
const customNodeDefinitions = [autoTypeDefinition({ componentProps: { jsonParse: JSON5.parse } })]

export default function AutoType() {
  const [data, setData] = useState<JsonData>(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useEditorDefaults()}
      rootName="probe"
      allowTypeSelection={false}
      jsonParse={JSON5.parse}
      customNodeDefinitions={customNodeDefinitions}
    />
  )
}
