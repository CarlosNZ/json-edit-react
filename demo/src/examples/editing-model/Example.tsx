import { useCallback, useState } from 'react'
import { Box, Button, Flex, FormLabel, Select, Text } from '@chakra-ui/react'
import {
  JsonEditor,
  type JsonData,
  type OnEditEventFunction,
  type UpdateFunction,
} from '@json-edit-react'
import { useExampleProps } from '../kit/exampleProps'
import { useExamplePalette } from '../kit/useThemePalette'
import { SplitPane } from '../kit/SplitPane'
import { EventViewer, type LogEntry } from './EventViewer'

const DELAY = 3000
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type Mode =
  | 'instant-ok'
  | 'slow-ok'
  | 'slow-fail'
  | 'slow-mixed'
  | 'override'
  | 'cancel-null'
  | 'throw'
  | 'gate-slow-ok'
  | 'gate-confirm'
  | 'gate-no-release'

// Each `onUpdate` behaviour, with a fuller description (what it does, what it
// simulates, what to expect) shown under the selector.
const MODES: { value: Mode; label: string; desc: string }[] = [
  {
    value: 'instant-ok',
    label: 'Instant OK',
    desc:
      'Commits instantly with no async work — the simplest path. Simulates a ' +
      'save that always succeeds right away. Good for watching the bare event ' +
      'lifecycle (start → submit → commit → updateSuccessful) with no timing.',
  },
  {
    value: 'slow-ok',
    label: 'Slow OK',
    desc:
      'Optimistic commit with a slow, successful save. Simulates a 3-second ' +
      'server round-trip: the editor closes and the new value shows ' +
      'immediately, then updateSuccessful fires ~3 s later. Tabbing between ' +
      'fields stays instant — a slow save never blocks editing.',
  },
  {
    value: 'slow-fail',
    label: 'Slow fail',
    desc:
      'Optimistic commit with a slow failure — the headline behaviour. ' +
      'Simulates a server save that rejects after 3 s: the value shows ' +
      'immediately, then automatically reverts and an inline error appears. ' +
      'You don’t have to do anything to recover it.',
  },
  {
    value: 'slow-mixed',
    label: 'Slow mixed',
    desc:
      'Optimistic save with per-value validation: anything containing the ' +
      'letter “z” is rejected after 3 s, everything else succeeds. Edit two ' +
      'fields quickly — one with a “z”, one without — and only the “z” one ' +
      'reverts while the other stays. A late failure reverts only its own node.',
  },
  {
    value: 'override',
    label: 'Override',
    desc:
      'The save returns a replacement document. Simulates a server that ' +
      'canonicalises your data: after 3 s the whole document is replaced with ' +
      'your edit plus a fresh top-level _editedAt timestamp — showing how an ' +
      'onUpdate `{ value }` return rewrites the result.',
  },
  {
    value: 'cancel-null',
    label: 'Silent cancel',
    desc:
      'A silent rejection. Simulates a save that quietly declines (e.g. a ' +
      'cancelled confirmation elsewhere): the value shows optimistically, ' +
      'then reverts after 3 s with no error and no toast — and no update event.',
  },
  {
    value: 'throw',
    label: 'Throw',
    desc:
      'An unexpected exception during save. Simulates onUpdate throwing after ' +
      '3 s: the edit reverts and the thrown message (“Simulated save failure”) ' +
      'surfaces as the error, just like a rejected promise would.',
  },
  {
    value: 'gate-slow-ok',
    label: 'Gate — hold',
    desc:
      'Uses hold() to opt out of the optimistic close. Simulates needing the ' +
      'editor to stay open while a 3 s async step runs: it stays open and the ' +
      'rest of the tree is blocked (try clicking another node — nothing ' +
      'happens) until it commits and closes.',
  },
  {
    value: 'gate-confirm',
    label: 'Gate — confirm',
    desc:
      'An interactive gate. Simulates confirming before committing: pressing ' +
      'Enter opens a window.confirm — OK commits the edit, Cancel discards it ' +
      '(the value reverts, no error). The editor stays open during the prompt.',
  },
  {
    value: 'gate-no-release',
    label: 'Gate — no release',
    desc:
      'hold() without ever calling release(). Simulates forgetting to release ' +
      'the gate: the commit still lands once onUpdate resolves (after 3 s) ' +
      'rather than hanging — confirming a hold() with no release() is safe.',
  },
]

const initialData = {
  name: 'Ada Lovelace',
  role: 'Engineer',
  active: true,
  score: 42,
  tags: ['alpha', 'beta'],
  address: { city: 'London', country: 'UK' },
}

export default function EditingModel() {
  const exampleProps = useExampleProps()
  const palette = useExamplePalette()
  const [data, setData] = useState<JsonData>(initialData)
  const [mode, setMode] = useState<Mode>('slow-fail')
  const [log, setLog] = useState<LogEntry[]>([])

  const append = useCallback((entry: Omit<LogEntry, 'id' | 'time'>) => {
    setLog((prev) => [
      ...prev,
      {
        ...entry,
        id: (prev[prev.length - 1]?.id ?? -1) + 1,
        time: new Date().toLocaleTimeString(),
      },
    ])
  }, [])

  // Mode-switchable instrumentation, mirroring the manual-test walkthrough:
  // optimistic-by-default commits, the `hold()` gate, and per-mode resolutions.
  const onUpdate = useCallback<UpdateFunction>(
    async (nodeData, { hold }) => {
      const newValue = 'newValue' in nodeData ? nodeData.newValue : undefined
      append({
        kind: 'update',
        label: `onUpdate[${mode}] ${nodeData.event}`,
        detail: `${JSON.stringify(nodeData.path)}${
          newValue !== undefined ? ` → ${JSON.stringify(newValue)}` : ''
        }`,
      })

      switch (mode) {
        case 'instant-ok':
          return
        case 'slow-ok':
          await wait(DELAY)
          return
        case 'slow-fail':
          await wait(DELAY)
          return false
        case 'slow-mixed':
          await wait(DELAY)
          return String(newValue ?? '').includes('z')
            ? { error: 'Contains a "z" — rejected' }
            : undefined
        case 'override':
          await wait(DELAY)
          return {
            value: {
              ...(nodeData.newData as Record<string, unknown>),
              _editedAt: new Date().toLocaleTimeString(),
            },
          }
        case 'cancel-null':
          await wait(DELAY)
          return null
        case 'throw':
          await wait(DELAY)
          throw new Error('Simulated save failure')
        case 'gate-slow-ok': {
          const release = hold()
          await wait(DELAY)
          release()
          return
        }
        case 'gate-confirm': {
          const release = hold()
          // Let React paint the held state before the blocking dialog.
          await wait(100)
          const ok = window.confirm(
            `Commit ${nodeData.event} at "${nodeData.path.join('.') || 'root'}"?`
          )
          if (!ok) return null
          release()
          return
        }
        case 'gate-no-release': {
          hold()
          await wait(DELAY)
          return
        }
        default:
          return
      }
    },
    [mode, append]
  )

  const onEditEvent = useCallback<OnEditEventFunction>(
    (e) => {
      append({
        kind: 'event',
        label: e.event,
        detail: [
          JSON.stringify(e.path),
          'operation' in e ? `op=${(e as { operation?: string }).operation}` : '',
          'error' in e ? `err=${JSON.stringify((e as { error?: unknown }).error)}` : '',
        ]
          .filter(Boolean)
          .join('  '),
      })
    },
    [append]
  )

  const current = MODES.find((m) => m.value === mode)!

  return (
    <>
      <SplitPane
        left={
          <Box className="block-shadow" borderRadius="md">
            <JsonEditor
              data={data}
              setData={setData}
              {...exampleProps}
              showErrorMessages
              allowTypeSelection
              onUpdate={onUpdate}
              onEditEvent={onEditEvent}
            />
          </Box>
        }
        right={
          // Mode block sits where the code panel does in other examples, themed
          // like the header (palette background + text colours).
          <Box
            borderRadius="lg"
            className="block-shadow"
            p={4}
            transition="background 0.4s ease"
            style={palette.headerBg}
          >
            <Flex align="center" gap={3} wrap="wrap">
              <FormLabel htmlFor="mode-select" m={0} whiteSpace="nowrap" color={palette.property}>
                onUpdate behaviour
              </FormLabel>
              <Select
                id="mode-select"
                size="sm"
                maxW={240}
                bg="white"
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                onClick={() => {
                  setData(initialData)
                  setLog([])
                }}
              >
                Reset
              </Button>
            </Flex>
            <Text fontSize="md" mt={3} color={palette.string}>
              {current.desc}
            </Text>
          </Box>
        }
      />

      <EventViewer log={log} onClear={() => setLog([])} />
    </>
  )
}
