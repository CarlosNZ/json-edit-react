import { useState } from 'react'
import { JsonViewer } from '@json-edit-react'
import { SearchBox } from '../../kit/SearchBox'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

// A rich, read-only document — the kind of reference data you browse but never
// edit. `JsonViewer` renders it with every edit affordance stripped: there are
// no edit / add / delete / drag controls anywhere in the tree, but you can
// still collapse and expand any branch, and copy a value (or its path).
const solarSystem = {
  star: {
    name: 'Sol',
    classification: 'G-type main-sequence (yellow dwarf)',
    ageBillionYears: 4.6,
    surfaceTempC: 5505,
    shareOfSystemMassPercent: 99.86,
  },
  planets: {
    Mercury: {
      nickname: 'The Swift Planet',
      moons: 0,
      hasRings: false,
      yearLengthEarthDays: 88,
      funFact: 'A single day lasts longer than its entire year.',
    },
    Venus: {
      nickname: "Earth's Evil Twin",
      moons: 0,
      hasRings: false,
      meanTempC: 464,
      atmosphere: { 'carbon dioxide': 96.5, nitrogen: 3.5 },
      funFact: 'Hotter than Mercury, thanks to a runaway greenhouse effect.',
    },
    Earth: {
      nickname: 'The Blue Marble',
      moons: 1,
      notableMoons: ['Luna'],
      hasLife: true,
      oceans: ['Pacific', 'Atlantic', 'Indian', 'Southern', 'Arctic'],
      funFact: 'The only known place in the universe with pizza.',
    },
    Mars: {
      nickname: 'The Red Planet',
      moons: 2,
      notableMoons: ['Phobos', 'Deimos'],
      globalMagneticField: null,
      tallestMountain: { name: 'Olympus Mons', heightKm: 21.9 },
      funFact: 'Home to the tallest volcano in the solar system — about 2.5× the height of Everest.',
    },
    Jupiter: {
      nickname: 'The Gas Giant',
      moons: 95,
      notableMoons: ['Io', 'Europa', 'Ganymede', 'Callisto'],
      hasRings: true,
      greatRedSpot: { type: 'storm', ragingForYears: '350+', widthInEarths: 1.3 },
      funFact: 'Its Great Red Spot is a storm wider than Earth that has lasted for centuries.',
    },
    Saturn: {
      nickname: 'The Ringed One',
      moons: 146,
      notableMoons: ['Titan', 'Enceladus', 'Mimas'],
      hasRings: true,
      densityRelativeToWater: 0.69,
      funFact: 'Less dense than water — it would float, given a big enough bathtub.',
    },
    Uranus: {
      nickname: 'The Sideways Planet',
      moons: 28,
      hasRings: true,
      axialTiltDegrees: 97.8,
      funFact: 'Rotates on its side, likely knocked over by an ancient collision.',
    },
    Neptune: {
      nickname: 'The Windy Giant',
      moons: 16,
      notableMoons: ['Triton'],
      hasRings: true,
      fastestWindsKmh: 2100,
      funFact: 'Has the fastest, most supersonic winds in the solar system.',
    },
  },
  dwarfPlanets: ['Pluto', 'Eris', 'Ceres', 'Makemake', 'Haumea'],
  totalPlanets: 8,
  lastSurveyed: '2026-06-18',
}

export default function SolarSystemViewer() {
  // Read-only, but still searchable: wire a search box to
  // `searchText` (no filter set, so it matches values).
  const [searchText, setSearchText] = useState('')

  return (
    <div style={{ position: 'relative' }}>
      <SearchBox value={searchText} onChange={setSearchText} placeholder="Search" />
      <JsonViewer
        data={solarSystem}
        {...useExampleProps()} // ---cut---
        rootName="solarSystem"
        collapse={2}
        searchText={searchText}
      />
    </div>
  )
}
