import { useEffect, useRef, useState } from 'react'
import { Box, Button, Flex, IconButton, Text } from '@chakra-ui/react'
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'

export interface LogEntry {
  id: number
  time: string
  // `event` = an `onEditEvent` lifecycle event (🔔); `update` = an `onUpdate`
  // call (⏳).
  kind: 'event' | 'update'
  label: string
  detail?: string
}

interface EventViewerProps {
  log: LogEntry[]
  onClear: () => void
}

// Floating, console-style panel that surfaces the editor's event stream so the
// scenarios can be exercised without opening devtools. Collapsible;
// auto-scrolls to the newest entry.
export const EventViewer = ({ log, onClear }: EventViewerProps) => {
  const [open, setOpen] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ block: 'nearest' })
  }, [log, open])

  return (
    <Box
      position="fixed"
      bottom={4}
      right={4}
      w={{ base: 'calc(100vw - 2rem)', sm: 380 }}
      zIndex={1500}
      bg="#1e1e1e"
      color="gray.100"
      borderRadius="md"
      className="block-shadow"
      overflow="hidden"
      display="flex"
      flexDirection="column"
      maxH={open ? '55vh' : undefined}
    >
      <Flex
        align="center"
        justify="space-between"
        px={3}
        py={2}
        bg="#2d2d2d"
        cursor="pointer"
        flexShrink={0}
        onClick={() => setOpen((o) => !o)}
      >
        <Text fontSize="sm" fontWeight="bold">
          Event viewer{' '}
          <Text as="span" color="gray.400" fontWeight="normal">
            ({log.length})
          </Text>
        </Text>
        <Flex align="center" gap={1}>
          <Button
            size="xs"
            variant="ghost"
            colorScheme="whiteAlpha"
            onClick={(e) => {
              e.stopPropagation()
              onClear()
            }}
          >
            Clear
          </Button>
          <IconButton
            aria-label={open ? 'Collapse event viewer' : 'Expand event viewer'}
            size="xs"
            variant="ghost"
            colorScheme="whiteAlpha"
            icon={open ? <ChevronDownIcon /> : <ChevronUpIcon />}
          />
        </Flex>
      </Flex>
      {/* `Box as="span"` (not `Text`): the demo's Chakra theme hard-sets a 16px
          `Text` baseStyle, so Text would ignore this container's font-size. Box
          has no such default and inherits it. */}
      {open && (
        <Box overflowY="auto" px={3} py={2} fontFamily="mono" fontSize="11px" lineHeight={1.5}>
          {log.length === 0 ? (
            <Box color="gray.500">
              Edit, rename, add or delete a node to see the event stream…
            </Box>
          ) : (
            log.map((e) => (
              <Box key={e.id} whiteSpace="pre-wrap" mb={0.5}>
                <Box as="span" color="gray.600">
                  {e.time}{' '}
                </Box>
                <Box
                  as="span"
                  color={e.kind === 'event' ? '#4fc1ff' : '#c0c0c0'}
                  fontWeight={e.kind === 'event' ? 'bold' : 'normal'}
                >
                  {e.kind === 'event' ? '🔔 ' : '⏳ '}
                  {e.label}
                </Box>
                {e.detail && (
                  <Box as="span" color="gray.400">
                    {' '}
                    {e.detail}
                  </Box>
                )}
              </Box>
            ))
          )}
          <div ref={bottomRef} />
        </Box>
      )}
    </Box>
  )
}
