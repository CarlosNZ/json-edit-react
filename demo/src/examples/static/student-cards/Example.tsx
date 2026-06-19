import { useMemo, useState } from 'react'
import {
  JsonEditor,
  type CustomNodeDefinition,
  type CustomWrapperProps,
  type JsonData,
} from '@json-edit-react'
import { booleanToggleDefinition } from '@json-edit-react/components'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

// Student ID cards. Only the objects inside `students` are matched
// (by their path), and each renders as a self-contained card: a
// `wrapperComponent` with the brackets and key turned off, drawing
// its own layout straight from the node's data.
//
// Unlike the "scientist" example, the card sets its OWN colours and
// fonts — it's a designed object, not themed chrome — so it looks
// identical on every editor theme. The surrounding fields (school,
// classroom, teacher) render normally.
//
// The "Render students as ID Cards" boolean (a pre-built
// BooleanToggle) gates the card definition: turn it off and the
// definition is dropped, so the students fall back to plain
// objects.

const SCHOOL = 'Westbrook High School'

interface Student {
  firstName: string
  lastName: string
  dob: string
  photo: string
  Enrolled: string
  studentId: string
  studentAssnMember: boolean
}

// tuple: first, last, dob, enrolled, id, assnMember, photo#
const ROSTER: [string, string, string, string, string, boolean, number][] = [
  ['Grace', 'Okafor', '2008-03-14', '2022-09-01', 'WB2291KT', true, 5],
  ['Liam', 'Tanaka', '2007-11-02', '2021-09-01', 'WB2147RM', false, 11],
  ['Sofia', 'Marchetti', '2009-01-27', '2023-02-06', 'WB2308QF', true, 32],
  ['Noah', 'Abebe', '2008-07-19', '2022-09-01', 'WB2284LP', false, 14],
  ['Mia', 'Nguyen', '2008-05-30', '2022-09-01', 'WB2276VC', true, 48],
  ['Ethan', 'Brooks', '2007-09-12', '2021-09-01', 'WB2103HD', false, 60],
  ['Ava', 'Russo', '2009-04-08', '2023-02-06', 'WB2319XN', true, 23],
  ['Kofi', 'Mensah', '2008-02-21', '2022-09-01', 'WB2255BW', false, 51],
  ['Isla', 'Fraser', '2007-12-15', '2021-09-01', 'WB2168JG', true, 9],
  ['Vanessa', 'Herrera', '2008-10-03', '2022-09-01', 'WB2242TZ', false, 36],
]

const students: Student[] = ROSTER.map(
  ([firstName, lastName, dob, Enrolled, studentId, studentAssnMember, img]) => ({
    firstName,
    lastName,
    dob,
    Enrolled,
    studentId,
    studentAssnMember,
    photo: `https://i.pravatar.cc/150?img=${img}`,
  })
)

const initialData = {
  'Render students as ID Cards': true,
  school: SCHOOL,
  classroom: 'Room 13',
  teacher: 'Ms Slate',
  students,
}

// The card's own design palette (independent of the editor theme).
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
const INK = '#1e293b' // headings
const SUBTLE = '#64748b' // labels
const BODY = '#334155' // values
const LINE = '#e2e8f0' // dividers
const BRAND = '#4f46e5' // indigo
const BRAND2 = '#7c3aed' // violet
const GOOD = '#047857' // emerald

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// '2008-03-14' → '14 Mar 2008' (no Date, so no timezone drift).
const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`
}

// A label / value pair in the card body grid.
const Field = ({ label, value }: { label: string; value: string }) => (
  <>
    <span style={{ color: SUBTLE }}>{label}</span>
    <span style={{ color: BODY, fontWeight: 500 }}>{value}</span>
  </>
)

// `wrapperComponent` for a student: ignores the node's default
// rendering entirely and lays out a card from `value` (the student
// object). The definition turns off the brackets and key, so this
// card is all that shows.
const StudentCard = ({ value }: CustomWrapperProps) => {
  const s = value as unknown as Student
  return (
    <div
      style={{
        width: 340,
        maxWidth: '100%',
        fontFamily: SANS,
        color: BODY,
        background: '#fff',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 6px 22px rgba(15, 23, 42, 0.18)',
        margin: '0.6em 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5em',
          padding: '0.55em 1em',
          background: `linear-gradient(135deg, ${BRAND}, ${BRAND2})`,
          color: '#fff',
        }}
      >
        <span style={{ fontSize: '1.1em' }}>🎓</span>
        <span
          style={{
            fontSize: '0.7em',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {SCHOOL} · Student ID
        </span>
      </div>

      <div style={{ display: 'flex', gap: '1em', padding: '1em' }}>
        <div
          style={{
            flex: '0 0 auto',
            width: 76,
            height: 76,
            borderRadius: '50%',
            backgroundColor: BRAND,
            backgroundImage: `url(${s.photo})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '3px solid #fff',
            boxShadow: `0 0 0 1px ${LINE}`,
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '1.2em', fontWeight: 700, color: INK, lineHeight: 1.15 }}>
            {s.firstName} {s.lastName}
          </div>
          <div
            style={{
              marginTop: '0.5em',
              display: 'grid',
              gridTemplateColumns: 'auto auto',
              gap: '0.2em 0.9em',
              fontSize: '0.8em',
            }}
          >
            <Field label="Born" value={formatDate(s.dob)} />
            <Field label="Enrolled" value={formatDate(s.Enrolled)} />
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.6em 1em',
          borderTop: `1px solid ${LINE}`,
        }}
      >
        {s.studentAssnMember ? (
          <span
            style={{
              fontSize: '0.68em',
              fontWeight: 700,
              color: GOOD,
              background: '#ecfdf5',
              border: `1px solid ${GOOD}33`,
              borderRadius: 999,
              padding: '0.2em 0.7em',
            }}
          >
            ★ Student Assn
          </span>
        ) : (
          <span />
        )}
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '0.85em',
            letterSpacing: '0.12em',
            color: SUBTLE,
          }}
        >
          {s.studentId}
        </span>
      </div>
    </div>
  )
}

// Match each object directly inside the `students` array — its
// path is ['students', <index>].
const studentCardDefinition: CustomNodeDefinition = {
  condition: ({ path }) => path.length === 2 && path[0] === 'students',
  wrapperComponent: StudentCard,
  showCollectionWrapper: false,
  showKey: false,
}

// Renders the "Render students as ID Cards" boolean as a switch.
const toggleDefinition = booleanToggleDefinition({
  condition: ({ key }) => key === 'Render students as ID Cards',
})

export default function StudentCards() {
  const [data, setData] = useState<JsonData>(initialData)

  // Drop the card definition when the toggle is off, so the
  // students render as plain objects again.
  const renderAsCards =
    (data as { 'Render students as ID Cards'?: boolean })['Render students as ID Cards'] ?? true
  const customNodeDefinitions = useMemo(
    () => [...(renderAsCards ? [studentCardDefinition] : []), toggleDefinition],
    [renderAsCards]
  )

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useExampleProps()} // ---cut---
      rootName="class"
      customNodeDefinitions={customNodeDefinitions}
    />
  )
}
