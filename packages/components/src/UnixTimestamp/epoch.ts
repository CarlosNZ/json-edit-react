/**
 * Epoch heuristics for the Unix-timestamp component.
 *
 * Plausible window: 1990-01-01 to 2100-01-01. The seconds and millisecond
 * bands don't overlap, so a single magnitude check serves two jobs: it's the
 * component's guard (keeping it off unrelated numbers like prices or IDs) and
 * it tells a seconds-epoch from a millisecond-epoch for the `'auto'` unit.
 */

export type UnixTimeUnit = 'auto' | 'seconds' | 'milliseconds'

const SECONDS_MIN = 631152000 // 1990-01-01T00:00:00Z, in seconds
const SECONDS_MAX = 4102444800 // 2100-01-01T00:00:00Z, in seconds
const MS_MIN = SECONDS_MIN * 1000
const MS_MAX = SECONDS_MAX * 1000

export const isSecondsEpoch = (value: number) => value >= SECONDS_MIN && value <= SECONDS_MAX

export const isMillisecondsEpoch = (value: number) => value >= MS_MIN && value <= MS_MAX

// Doubles as the component's guard — see file header.
export const isPlausibleEpoch = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  (isSecondsEpoch(value) || isMillisecondsEpoch(value))

// Resolve `'auto'` to a concrete unit from the value's magnitude; a forced unit
// wins. Outside both bands (only reachable via a forced or garbage value),
// `'auto'` assumes milliseconds (JS-native).
export const resolveUnit = (value: number, unit: UnixTimeUnit): 'seconds' | 'milliseconds' =>
  unit === 'auto' ? (isSecondsEpoch(value) ? 'seconds' : 'milliseconds') : unit

export const epochToDate = (value: number, unit: UnixTimeUnit): Date =>
  new Date(resolveUnit(value, unit) === 'seconds' ? value * 1000 : value)

// Serialise a picked Date back to an epoch number, preserving the unit. The
// `reference` value (the one being edited) resolves the `'auto'` unit, so a
// commit keeps the field in whatever unit it started in.
export const dateToEpoch = (date: Date, unit: UnixTimeUnit, reference: number): number =>
  resolveUnit(reference, unit) === 'seconds' ? Math.round(date.getTime() / 1000) : date.getTime()
