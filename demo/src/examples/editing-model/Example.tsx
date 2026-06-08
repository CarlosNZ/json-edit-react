import { useCallback, useState } from 'react'
import { Box, Button, Flex, FormLabel, Select, SimpleGrid, Text } from '@chakra-ui/react'
import {
  JsonEditor,
  type JsonData,
  type OnEditEventFunction,
  type UpdateFunction,
} from '@json-edit-react'
import { useExampleProps } from '../kit/exampleProps'
import { useExamplePalette } from '../kit/useThemePalette'
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

// Each `onUpdate` behaviour + a one-line description shown under the selector.
const MODES: { value: Mode; label: string; desc: string }[] = [
  { value: 'instant-ok', label: 'Instant OK', desc: 'Commit immediately (fast path).' },
  { value: 'slow-ok', label: 'Slow OK', desc: 'Optimistic — closes now, succeeds after 3 s.' },
  {
    value: 'slow-fail',
    label: 'Slow fail',
    desc: 'Optimistic — closes now, then reverts + errors after 3 s.',
  },
  {
    value: 'slow-mixed',
    label: 'Slow mixed',
    desc: 'Succeeds, but rejects any value containing the letter “z”.',
  },
  {
    value: 'override',
    label: 'Override',
    desc: 'Commits, replacing the document (adds an _editedAt stamp).',
  },
  {
    value: 'cancel-null',
    label: 'Silent cancel',
    desc: 'Optimistic, then silently reverts (no error) after 3 s.',
  },
  { value: 'throw', label: 'Throw', desc: 'Optimistic, then throws after 3 s.' },
  {
    value: 'gate-slow-ok',
    label: 'Gate — hold',
    desc: 'hold(): stays open + blocks the tree for 3 s, then commits.',
  },
  {
    value: 'gate-confirm',
    label: 'Gate — confirm',
    desc: 'hold(): stays open, asks window.confirm, commits or discards.',
  },
  {
    value: 'gate-no-release',
    label: 'Gate — no release',
    desc: 'hold() but never release(): resolution decides.',
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
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} alignItems="start">
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

        {/* Mode block sits where the code panel does in other examples, themed
            like the header (palette background + text colours). */}
        <Box
          borderRadius="lg"
          className="block-shadow"
          p={4}
          transition="background 0.4s ease"
          style={palette.headerBg}
        >
          <Flex align="center" gap={3} wrap="wrap">
            <FormLabel
              htmlFor="mode-select"
              m={0}
              fontSize="sm"
              whiteSpace="nowrap"
              color={palette.property}
            >
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
          <Text fontSize="sm" mt={3} color={palette.string}>
            {current.desc}
          </Text>
        </Box>
      </SimpleGrid>

      <EventViewer log={log} onClear={() => setLog([])} />
    </>
  )
}
