import { type RefObject } from 'react'
import { Button, Checkbox, Flex, HStack, Input, Text, useToast, VStack } from '@chakra-ui/react'
import { splitPropertyString, type JsonEditorHandle } from '@json-edit-react'

interface ExternalControlPanelProps {
  editorRef: RefObject<JsonEditorHandle | null>
  handlePath: string
  setHandlePath: (path: string) => void
  handleIncludeChildren: boolean
  setHandleIncludeChildren: (include: boolean) => void
  // Whether a node is currently being edited (tracked by `App` via
  // `onEditEvent`) — gates the Confirm/Cancel buttons.
  isEditing: boolean
  // Collapse (true) or expand (false) the node at the entered path.
  onCollapse: (collapsed: boolean) => void
}

// Test panel for the `editorRef` imperative handle. Enter a dot-separated
// path (e.g. "user.name" or "items.0"); empty = root. Actions operate on
// that path. All the bridging state lives in `App` (it's shared with the
// editor instance), so this component just renders and dispatches.
export const ExternalControlPanel = ({
  editorRef,
  handlePath,
  setHandlePath,
  handleIncludeChildren,
  setHandleIncludeChildren,
  isEditing,
  onCollapse,
}: ExternalControlPanelProps) => {
  const toast = useToast()
  // Parked: an "override restrictions" toggle for `startEdit` (see the
  // commented checkbox below).
  // const [handleOverrideRestrictions, setHandleOverrideRestrictions] = useState(false)
  return (
    <VStack w="100%" align="stretch" gap={2} pt={2} mt={2}>
      <Text as="h3">External Control</Text>
      <Input
        size="sm"
        placeholder="path, e.g. user.name or items[0] (empty = root)"
        value={handlePath}
        onChange={(e) => setHandlePath(e.target.value)}
      />
      <HStack gap={2} flexWrap="wrap" w="100%" justify="space-between">
        <Flex justify="space-between">
          <Button
            size="sm"
            onClick={() => {
              const result = editorRef.current?.startEdit({
                path: splitPropertyString(handlePath),
                // overrideRestrictions: handleOverrideRestrictions,
              })
              if (result && result !== true)
                toast({
                  title: "Can't edit that node",
                  description:
                    result === 'RESTRICTED'
                      ? 'That node is restricted from editing'
                      : 'No node found at that path',
                  status: 'warning',
                  duration: 2000,
                  isClosable: true,
                })
            }}
            colorScheme="primaryScheme"
            variant="outline"
          >
            Start edit
          </Button>
        </Flex>
        {/* Confirm/Cancel only make sense while an edit is active;
            `isEditing` is tracked via `onEditEvent`. */}
        {isEditing && (
          <Flex gap={2}>
            <Button
              size="sm"
              onClick={() => editorRef.current?.confirm()}
              colorScheme="primaryScheme"
              variant="outline"
            >
              Confirm
            </Button>
            <Button
              size="sm"
              onClick={() => editorRef.current?.cancel()}
              colorScheme="primaryScheme"
              variant="outline"
            >
              Cancel
            </Button>
          </Flex>
        )}
        {/* <Checkbox
          isChecked={handleOverrideRestrictions}
          onChange={(e) => setHandleOverrideRestrictions(e.target.checked)}
          whiteSpace="nowrap"
        >
          Override restrictions
        </Checkbox> */}
      </HStack>
      <HStack gap={2} flexWrap="wrap">
        <Button
          size="sm"
          onClick={() => onCollapse(true)}
          colorScheme="primaryScheme"
          variant="outline"
        >
          Collapse
        </Button>
        <Button
          size="sm"
          onClick={() => onCollapse(false)}
          colorScheme="primaryScheme"
          variant="outline"
        >
          Expand
        </Button>
        <Checkbox
          isChecked={handleIncludeChildren}
          onChange={(e) => setHandleIncludeChildren(e.target.checked)}
          whiteSpace="nowrap"
        >
          Include children
        </Checkbox>
      </HStack>
    </VStack>
  )
}
