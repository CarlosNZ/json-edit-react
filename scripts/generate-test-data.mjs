// Generator for a large, varied JSON test fixture — a fictional medieval
// realm ("Vethralis"). Kept around so the test data can be regenerated or
// tuned for future perf work (§16). Uses a seeded PRNG so the output is
// reproducible: same seed → byte-identical file.
//
// Usage:
//   node scripts/generate-test-data.mjs \
//     [outputPath] [kingdomCount] [provincesPerKingdom]
//
// Without arguments, writes 6 kingdoms to `scripts/massive-test-data.json5`.
// Kingdoms dominate node count (~27k each), so `kingdomCount` is the coarse
// size knob — e.g. 4 ≈ ~100k nodes, 3 ≈ ~82k nodes. For smaller fixtures, use
// 1 kingdom and cap its provinces (the bulk driver, normally 5–8) via
// `provincesPerKingdom` — e.g. `… 1 4` ≈ ~20k nodes.

import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEFAULT_OUTPUT = resolve(__dirname, 'massive-test-data.json5')

const SEED = 42

// --- Seeded PRNG (Numerical Recipes LCG) ---
function makeRng(seed) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}
const rng = makeRng(SEED)
const rand = () => rng()
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const range = (min, max) => min + Math.floor(rand() * (max - min + 1))
const chance = (p) => rand() < p
const pickN = (arr, n) => {
  const copy = arr.slice()
  const out = []
  for (let i = 0; i < n && copy.length > 0; i++) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0])
  }
  return out
}

// --- Word lists ---
const FIRST_NAMES_M = [
  'Aldric', 'Bevan', 'Cassian', 'Dorian', 'Eamon', 'Faelan', 'Gareth', 'Halvor',
  'Ivar', 'Jorund', 'Kael', 'Lorcan', 'Mathis', 'Nyles', 'Orin', 'Perrin',
  'Quillen', 'Roderic', 'Sefton', 'Tarrick', 'Ulric', 'Varic', 'Wyot', 'Yorick',
]
const FIRST_NAMES_F = [
  'Adella', 'Brynhild', 'Carys', 'Delwyn', 'Elara', 'Fionnuala', 'Gwendolyn',
  'Hesper', 'Iseult', 'Joran', 'Kestra', 'Linnea', 'Mira', 'Niamh', 'Ondine',
  'Petra', 'Quintessa', 'Rhona', 'Saskia', 'Talwyn', 'Una', 'Vesna', 'Wren',
]
const LAST_NAMES = [
  'Ironwood', 'Stormwind', 'Brightspear', 'Ravenshade', 'Goldlock', 'Hollowmere',
  'Thornblood', 'Silvermane', 'Ashenvale', 'Wyrmsbane', 'Coldhollow', 'Fellgrove',
  'Mossheart', 'Stillwater', 'Greycloak', 'Vandermere', 'Oakenshield', 'Brassgate',
]
const TITLES = ['Lord', 'Lady', 'Baron', 'Baroness', 'Duke', 'Duchess', 'Count', 'Countess', 'Marshal', 'Magister']

const KINGDOM_PREFIXES = ['Vel', 'Thra', 'Aeg', 'Mor', 'Pyr', 'Cor', 'Ulth', 'Bryn', 'Drov']
const KINGDOM_SUFFIXES = ['moria', 'darrow', 'helm', 'reach', 'wynne', 'gard', 'venna', 'thal']

const PROVINCE_ADJ = ['Northern', 'Southern', 'Eastern', 'Western', 'High', 'Low', 'Inner', 'Outer', 'Hollow', 'Green', 'Iron', 'Stone']
const PROVINCE_NAMES = ['Verdanwood', 'Stormcrag', 'Marrowfen', 'Tallowmere', 'Brackmoor', 'Whisperdell', 'Drymeadow', 'Saltmire', 'Frostvale', 'Sundered Reach', 'Glasshollow', 'Ironbark Vale']
const TERRAINS = ['dense forest', 'rolling hills', 'high mountains', 'salt marsh', 'open steppe', 'tundra', 'coastal cliffs', 'lake country', 'arid plain', 'jungle', 'volcanic ridge', 'enchanted glade']

const CITY_NAMES = ['Thornsbury', 'Ravenport', 'Goldsmoor', 'Briarwell', 'Hightower', 'Greypine', 'Saltkettle', 'Lowmarsh', 'Old Wendel', 'Three Streams', 'Cinderfen', 'Highmere', 'Wyrmbridge', 'Frosthaven', 'Whitepine', 'Drift']

const DISTRICT_FUNCTIONS = ['commerce', 'crafts', 'residential', 'governance', 'religious', 'docks', 'noble quarter', 'tannery row', 'foreign quarter', 'gardens', 'mills', 'graveyard']
const DISTRICT_NAMES = ['Lantern Square', 'Tarpit Lane', 'High Vine', 'Smithwell', 'The Gallows', 'Cobblestone End', 'Old Forum', 'Sundial Hill', "Hangman's Cross", 'The Loft', 'Westbridge', 'Sour End']

const BUILDING_TYPES = ['tavern', 'forge', 'shrine', 'apothecary', 'library', 'guildhall', 'bathhouse', 'mill', 'stable', 'workshop', 'observatory', 'cartographer', "scribe's den", 'tailor', 'cobbler', 'jeweler', 'mortuary']
const BUILDING_ADJ = ['Crooked', 'Silent', 'Gilded', 'Crimson', 'Drowned', 'Half-Moon', 'Singing', 'Whispering', 'Iron', 'Tilted', 'Velvet', 'Brass', 'Black', 'Three', 'Lonely']
const BUILDING_NOUNS = ['Goose', 'Anvil', 'Lantern', 'Goblet', 'Owl', 'Mare', 'Tower', 'Stag', 'Quill', 'Crow', 'Hearth', 'Bell', 'Hand', 'Boar', 'Saint']

const PROFESSIONS = ['blacksmith', 'baker', 'fletcher', 'apothecary', 'priest', 'merchant', 'scribe', 'tanner', 'farmer', 'soldier', 'sailor', 'fisher', 'cartwright', 'midwife', 'cook', 'minstrel', 'tutor', 'cobbler', 'weaver', 'beekeeper']
const RACES = ['human', 'half-elf', 'dwarf', 'halfling', 'tiefling', 'orc-blood', 'gnome', 'half-giant']

const TRAITS = ['cunning', 'devout', 'reckless', 'patient', 'jovial', 'sour', 'scholarly', 'shy', 'brave', 'pragmatic', 'lazy', 'ambitious', 'cruel', 'kind', 'restless', 'haunted', 'proud', 'observant', 'sentimental', 'stoic']
const QUIRKS = ['talks to plants', 'collects beetles', 'never sleeps in a bed', 'fears mirrors', 'writes letters to the dead', 'carves runes on the inside of doors', 'always whistles in fives', 'refuses to eat red food', 'keeps a diary in cipher', 'feeds stray cats nightly']

const POSSESSION_TYPES = ['ring', 'amulet', 'dagger', 'scroll', 'letter', 'locket', 'book', 'flask', 'tinder box', 'coin purse', 'whetstone', 'compass', 'medallion']
const POSSESSION_MATERIALS = ['silver', 'bronze', 'iron', 'oak', 'bone', 'pewter', 'tin', 'lead', 'leather', 'glass', 'lacquered wood']

const RELIGIONS = ['Order of the Hollow Star', 'Cult of the Verdant Mother', 'The Three-Faced Saint', 'Path of Quiet Water', 'House of Iron Mercy', 'Followers of the Lantern', 'The Old Pact']
const RESOURCES = ['silver ore', 'oak timber', 'salt', 'iron', 'amber', 'wool', 'fish', 'honey', 'mead', 'glass sand', 'limestone', 'rare herbs']

const EVENT_TYPES = ['skirmish', 'famine', 'wedding', 'eclipse', 'plague', 'discovery', 'treaty', 'rebellion', 'flood', 'comet sighting', 'royal birth', 'execution']

const ARTIFACT_NAMES = ['The Ember Crown', 'Hollowtongue Blade', 'The Sundered Codex', 'Pyrewight Mantle', 'Whisper-of-Velmoria', 'The Glass Heart', 'Marrowstone Compass', 'The Pale Banner']
const ARTIFACT_POWERS = ['speaks the names of the recently dead', 'glows when truth is spoken', 'cannot be lifted by the wicked', 'shows the wielder their own future death', 'tastes faintly of seawater', 'is heavier in winter', 'cannot be drawn in moonlight']

const QUOTES = [
  'They came on the third night, and we knew them only by the soft sound of footsteps in the snow.',
  'No king sits the throne of Brynvenna who has not first tasted the bitter root.',
  'My grandmother said the river remembers — that what you throw in, it gives back, eventually, somewhere downstream.',
  'A debt unwritten is a debt unowed, and the magistrate would do well to recall it.',
  'There are sixteen names in the Book and only fifteen graves; we do not speak of the missing one.',
  'The forge does not care who hammers the iron. Only that it is hammered well.',
  'Three roads out of Tallowmere and not one of them safe after dusk.',
  'The boy returned at midwinter, and the dogs would not look at him.',
]

// --- Name helpers ---
const maleName = () => `${pick(FIRST_NAMES_M)} ${pick(LAST_NAMES)}`
const femaleName = () => `${pick(FIRST_NAMES_F)} ${pick(LAST_NAMES)}`
const personName = () => (chance(0.5) ? maleName() : femaleName())
const kingdomName = () => `${pick(KINGDOM_PREFIXES)}${pick(KINGDOM_SUFFIXES)}`
const provinceName = () =>
  chance(0.6) ? pick(PROVINCE_NAMES) : `${pick(PROVINCE_ADJ)} ${pick(PROVINCE_NAMES)}`
const buildingName = () => `The ${pick(BUILDING_ADJ)} ${pick(BUILDING_NOUNS)}`

// --- Builders ---

function makePossession() {
  return {
    type: pick(POSSESSION_TYPES),
    material: pick(POSSESSION_MATERIALS),
    weight_oz: Math.round(rand() * 80) / 10,
    inscribed: chance(0.25) ? pick(QUOTES).slice(0, 40) : null,
    estimated_value_silver: range(1, 500),
    bequeathed: chance(0.1),
  }
}

function makeInhabitant() {
  const age = range(6, 78)
  return {
    name: personName(),
    age,
    race: pick(RACES),
    profession: age < 16 ? 'apprentice' : pick(PROFESSIONS),
    traits: pickN(TRAITS, range(2, 4)),
    quirk: chance(0.35) ? pick(QUIRKS) : null,
    family_size: range(1, 8),
    literate: chance(age > 30 ? 0.4 : 0.2),
    possessions: Array.from({ length: range(0, 2) }, makePossession),
    debts_owed_silver: chance(0.3) ? range(5, 2000) : 0,
  }
}

function makeBuilding() {
  const type = pick(BUILDING_TYPES)
  const inhabitantCount = type === 'tavern' || type === 'guildhall' ? range(2, 5) : range(1, 3)
  return {
    name: buildingName(),
    type,
    founded_year: range(-450, 1247),
    floors: range(1, 4),
    has_cellar: chance(0.4),
    owner: personName(),
    inhabitants: Array.from({ length: inhabitantCount }, makeInhabitant),
    tales_told: chance(0.3) ? pickN(QUOTES, range(1, 3)) : [],
    annual_taxes_silver: range(20, 2000),
    last_inspected: chance(0.7)
      ? `${range(1240, 1247)}-${String(range(1, 12)).padStart(2, '0')}-${String(range(1, 28)).padStart(2, '0')}`
      : null,
  }
}

function makeDistrict() {
  return {
    name: pick(DISTRICT_NAMES),
    primary_function: pick(DISTRICT_FUNCTIONS),
    population_estimate: range(80, 4000),
    crime_rating: pick(['negligible', 'low', 'moderate', 'high', 'extreme']),
    has_walls: chance(0.4),
    buildings: Array.from({ length: range(2, 4) }, makeBuilding),
    notable_locations: pickN(['old well', 'fountain', 'gallows', 'stables', 'market cross', 'shrine niche'], range(1, 3)),
  }
}

function makeCity() {
  return {
    name: pick(CITY_NAMES) + (chance(0.3) ? ` (${pick(['Old', 'New', 'Upper', 'Lower'])})` : ''),
    founded_year: range(-800, 900),
    population: range(800, 80000),
    mayor: {
      name: personName(),
      title: pick(TITLES),
      term_started: range(1230, 1247),
      approval_rating: Math.round(rand() * 100) / 100,
      scandals: pickN(['embezzlement', 'duelling', 'witchcraft accusations', 'unpaid debts'], range(0, 2)),
    },
    walls: {
      present: chance(0.8),
      height_yards: range(8, 30),
      gates: range(1, 6),
      manned: chance(0.7),
    },
    districts: Array.from({ length: range(3, 5) }, makeDistrict),
    active_quests: chance(0.5)
      ? pickN(
          [
            'find the missing baker',
            'investigate strange lights at the granary',
            "recover the magistrate's stolen seal",
            'escort the wool caravan to the next city',
            'identify the body found in the river',
          ],
          range(1, 3)
        )
      : [],
    sister_cities: pickN(CITY_NAMES, range(0, 3)),
  }
}

function makeProvince() {
  return {
    name: provinceName(),
    governor: {
      name: personName(),
      title: pick(TITLES),
      age: range(35, 75),
      traits: pickN(TRAITS, range(2, 4)),
      lineage: Array.from({ length: range(2, 5) }, () => ({
        name: personName(),
        relation: pick(['father', 'mother', 'grandparent', 'great-grandparent']),
        died: range(1180, 1240),
        cause_of_death: pick(['old age', 'plague', 'duel', 'unknown', 'in battle', 'fever', 'fall from horse']),
      })),
      household: Array.from({ length: range(3, 8) }, () => ({
        name: personName(),
        role: pick(['steward', 'cook', 'master-at-arms', 'tutor', 'scribe', 'physician', 'falconer']),
        loyal: chance(0.8),
      })),
    },
    area_sq_leagues: range(200, 8000),
    primary_terrain: pick(TERRAINS),
    population: range(15000, 600000),
    cities: Array.from({ length: range(3, 6) }, makeCity),
    natural_resources: pickN(RESOURCES, range(2, 5)),
    rivers: pickN(['Greysong', 'Marrow', 'Pyrebend', 'Stillwater', 'Three Maidens', 'Black Ash'], range(0, 3)),
    tax_revenue_silver: range(50000, 2000000),
    has_standing_militia: chance(0.7),
    rebellion_risk: pick(['none', 'whispers only', 'plausible', 'imminent']),
  }
}

function makeKingdom(provincesPerKingdom) {
  return {
    name: kingdomName(),
    founded_year: range(-900, 200),
    capital: pick(CITY_NAMES),
    ruler: {
      name: personName(),
      title: pick(['King', 'Queen', 'High King', 'Sovereign Lord', 'Crown Regent']),
      age: range(30, 80),
      ascended: range(1200, 1247),
      traits: pickN(TRAITS, range(2, 5)),
      claim_legitimate: chance(0.85),
      heirs: Array.from({ length: range(0, 4) }, () => ({
        name: personName(),
        age: range(0, 35),
        legitimate: chance(0.85),
        in_line: range(1, 10),
        notable_for: chance(0.4)
          ? pick([
              'marrying a foreigner',
              'losing a duel',
              'composing songs',
              'a botched assassination attempt',
              'patronage of the arts',
              'an unfortunate hunting accident',
            ])
          : null,
      })),
      lineage: Array.from({ length: range(3, 6) }, () => ({
        name: personName(),
        ruled_years: range(2, 50),
        died: range(800, 1247),
        epithet: chance(0.5)
          ? pick(['the Bold', 'the Quiet', 'the Stammerer', 'the Wise', 'the Fox', 'the Drowned', 'the Bald', 'the Patient', 'the Mad', 'the Generous'])
          : null,
      })),
    },
    demographics: {
      total_population: range(500000, 5000000),
      racial_breakdown: Object.fromEntries(RACES.map((r) => [r, Math.round(rand() * 1000) / 10])),
      dominant_religion: pick(RELIGIONS),
      religious_tolerance: pick(['high', 'moderate', 'low', 'persecutory']),
      literacy_rate_pct: Math.round(rand() * 400) / 10,
    },
    provinces: Array.from({ length: provincesPerKingdom ?? range(5, 8) }, makeProvince),
    factions: Array.from({ length: range(2, 5) }, () => ({
      name: `The ${pick(BUILDING_ADJ)} ${pick(['Hand', 'Order', 'Council', 'Brotherhood', 'Court'])}`,
      leader: personName(),
      members_estimate: range(50, 5000),
      ideology: pick([
        'restoration of the old kings',
        'reform of the tax code',
        'expulsion of foreigners',
        'religious purity',
        'mercantile interests',
        'common-folk uprising',
      ]),
      threat_level: pick(['negligible', 'low', 'moderate', 'high', 'critical']),
      known_safehouses: pickN(CITY_NAMES, range(0, 4)),
    })),
    trade_partners: pickN(
      ['Velmoria', 'Thradarrow', 'Aeghelm', 'Morreach', 'Pyrwynne', 'Corgard', 'Ulthvenna', 'Brynthal'],
      range(2, 5)
    ),
    historical_events: Array.from({ length: range(4, 8) }, () => ({
      year: range(-800, 1247),
      type: pick(EVENT_TYPES),
      summary: pick(QUOTES),
      casualties: chance(0.5) ? range(10, 10000) : null,
      remembered: chance(0.7),
    })),
  }
}

// --- Top-level assembly ---

function makeRealm(kingdomCount, provincesPerKingdom) {
  return {
    meta: {
      world_name: 'Vethralis',
      current_year: 1247,
      reckoning: 'Years since the Pact of Ash',
      cataclysms: ['the Sundering', 'the Black Plague of 904', 'the Year Without Summer (1118)'],
      cosmology: {
        celestial_bodies: [
          { name: 'the Sun', class: 'star' },
          { name: 'the Silver Mother', class: 'moon', phase_at_year_start: 'waning gibbous' },
          { name: "the Crone's Lantern", class: 'moon', phase_at_year_start: 'new' },
        ],
        constellations: ['the Drowned Maiden', 'the Three Hounds', 'the Hollow Crown', 'the Singing Spear'],
      },
      languages: pickN(
        ['Common', 'Old Velmoric', 'High Aegheln', 'Trade Pidgin', 'Greysong (river-cant)', 'Wyrmtongue (dead)'],
        5
      ),
      seasons: [
        { name: 'Frostbreak', months: 3, observed_festivals: ['Lighting of Lanterns', 'Naming Day'] },
        { name: 'Greenrise', months: 2, observed_festivals: ['First Furrow', "Mother's Bloom"] },
        { name: 'Sunheight', months: 3, observed_festivals: ['Midsummer Vigil', 'The Long Market'] },
        { name: 'Ashfall', months: 2, observed_festivals: ['Reckoning', 'Lantern Dousing'] },
        { name: 'Hollow', months: 2, observed_festivals: ['Night of Three Doors', 'The Quiet Week'] },
      ],
    },
    kingdoms: Array.from({ length: kingdomCount }, () => makeKingdom(provincesPerKingdom)),
    wandering_orders: Array.from({ length: 8 }, () => ({
      name: `Order of ${pick(['the Wandering Star', 'the Quiet Vow', 'the Blackened Tower', 'the Salt Road', 'the Open Eye', 'the Hidden Path', 'the Pyre', 'the Last Light'])}`,
      founded_year: range(-300, 1100),
      members_estimate: range(20, 600),
      doctrine: pick(QUOTES),
      forbidden_in: pickN(['Velmoria', 'Thradarrow', 'Aeghelm', 'Morreach'], range(0, 3)),
      notable_members: Array.from({ length: range(2, 5) }, () => ({
        name: personName(),
        rank: pick(['acolyte', 'sworn', 'wandering brother', 'master', 'grand archon']),
        years_in_order: range(1, 50),
        sworn_to: pick(QUIRKS),
      })),
    })),
    ancient_artifacts: Array.from({ length: 10 }, () => ({
      name: pick(ARTIFACT_NAMES),
      origin: kingdomName(),
      age_years: range(200, 4000),
      current_status: pick([
        'held by crown',
        'lost',
        'destroyed',
        'in private hands',
        'whereabouts unknown',
        'sealed in vault',
      ]),
      power: pick(ARTIFACT_POWERS),
      known_bearers: Array.from({ length: range(1, 4) }, () => ({
        name: personName(),
        held_from_year: range(-200, 1200),
        held_until_year: chance(0.7) ? range(-100, 1247) : null,
        fate: pick(['died of old age', 'assassinated', 'drowned', 'disappeared', 'still bears it', 'gave it up willingly']),
      })),
    })),
    world_events: Array.from({ length: 20 }, () => ({
      year: range(900, 1247),
      type: pick(EVENT_TYPES),
      affected_kingdoms: pickN(
        ['Velmoria', 'Thradarrow', 'Aeghelm', 'Morreach', 'Pyrwynne', 'Corgard'],
        range(1, 4)
      ),
      summary: pick(QUOTES),
      ongoing: chance(0.2),
    })),
  }
}

// --- Run ---

// Parse an optional positive-integer CLI arg. Throw on junk rather than letting
// `Number('abc')` → NaN flow through to `Array.from({ length: NaN })` (= 0) and
// silently emit an empty/tiny fixture that looks like a successful run.
const parseCount = (raw, label) => {
  if (raw === undefined) return undefined
  if (!/^\d+$/.test(raw) || Number(raw) < 1) {
    throw new Error(`Invalid ${label}: "${raw}" — expected a positive integer`)
  }
  return Number(raw)
}

const outputPath = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_OUTPUT
const kingdomCount = parseCount(process.argv[3], 'kingdom count') ?? 6
const provincesPerKingdom = parseCount(process.argv[4], 'provinces-per-kingdom')
const data = makeRealm(kingdomCount, provincesPerKingdom)
const header =
  '// Generated by scripts/generate-test-data.mjs for performance and load-bearing testing.\n'
const out = header + JSON.stringify(data, null, 2) + '\n'
writeFileSync(outputPath, out)

// Count nodes (rough — every value in the recursive walk counts as one)
function countNodes(v) {
  if (Array.isArray(v)) return 1 + v.reduce((acc, x) => acc + countNodes(x), 0)
  if (v && typeof v === 'object') return 1 + Object.values(v).reduce((acc, x) => acc + countNodes(x), 0)
  return 1
}
const nodes = countNodes(data)
const bytes = Buffer.byteLength(out, 'utf8')
console.log(`Wrote: ${outputPath}`)
console.log(`Nodes: ${nodes.toLocaleString()}`)
console.log(`Size:  ${(bytes / (1024 * 1024)).toFixed(2)} MB (${bytes.toLocaleString()} bytes)`)
