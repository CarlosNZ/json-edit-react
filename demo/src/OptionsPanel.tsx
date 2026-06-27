import { type ChangeEvent, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import {
  Box,
  Checkbox,
  CheckboxGroup,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Link,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  Tooltip,
  VStack,
} from '@chakra-ui/react'
import { InfoIcon } from '@chakra-ui/icons'
import { Link as RouterLink } from 'wouter'
import { demoDataDefinitions, type DemoPayload } from './demoData'
import { type AppState } from './useDemoState'

const themeNames = [
  'Default',
  'Github Dark',
  'Github Light',
  'White & Black',
  'Black & White',
  'Candy Wrapper',
  'Psychedelic',
  'Solarized Dark',
  'Solarized Light',
  'Dracula',
  'Monokai',
  'Tokyo Night',
  'r18jv',
  'TMF',
]

interface OptionsPanelProps {
  state: AppState
  updateState: (patch: Partial<AppState>) => void
  toggleState: (field: keyof AppState) => void
  selectedDataSet: string
  // The active data set's payload — used to disable controls the data set
  // configures itself (e.g. its own `allowEdit`/`defaultValue`).
  activePayload: Partial<DemoPayload> | null
  handleChangeData: (selected: string) => void
  handleThemeChange: (e: ChangeEvent<HTMLSelectElement>) => void
  externalControlEnabled: boolean
  showExternalControl: boolean
  setShowImperativeHandle: Dispatch<SetStateAction<boolean>>
  // The active data set's description, shown beneath the controls.
  description: ReactNode
  // Slug of the matching example page, if any (renders a source-code link).
  exampleSlug: string | undefined
  // The External Control panel is slotted in here so its cross-column state
  // (shared with the editor) stays owned by `App` rather than threaded
  // through this component.
  children?: ReactNode
}

export const OptionsPanel = ({
  state,
  updateState,
  toggleState,
  selectedDataSet,
  activePayload,
  handleChangeData,
  handleThemeChange,
  externalControlEnabled,
  showExternalControl,
  setShowImperativeHandle,
  description,
  exampleSlug,
  children,
}: OptionsPanelProps) => (
  <VStack flexBasis={500}>
    <Heading size="lg" variant="accent">
      Options
    </Heading>
    <VStack backgroundColor="#f6f6f6" borderRadius={10} className="block-shadow">
      <FormControl>
        <VStack align="flex-start" m={4}>
          <HStack className="inputRow">
            <FormLabel className="labelWidth" textAlign="right">
              Demo data
            </FormLabel>
            <div className="inputWidth" style={{ flexGrow: 1 }}>
              <Select
                id="dataSelect"
                onChange={(e) => handleChangeData(e.target.value)}
                value={selectedDataSet}
              >
                {Object.entries(demoDataDefinitions).map(([key, { name }]) => (
                  <option value={key} key={key}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
          </HStack>
          <HStack className="inputRow">
            <FormLabel className="labelWidth" textAlign="right">
              Theme
            </FormLabel>
            <div className="inputWidth" style={{ flexGrow: 1 }}>
              <Select id="themeSelect" onChange={handleThemeChange} value={state.theme.displayName}>
                {themeNames.map((themeName) => (
                  <option value={themeName} key={themeName}>
                    {themeName}
                  </option>
                ))}
              </Select>
            </div>
          </HStack>
          <HStack className="inputRow">
            <FormLabel className="labelWidth" textAlign="right">
              Data root name
            </FormLabel>
            <Input
              id="dataNameInput"
              className="inputWidth"
              type="text"
              value={state.rootName}
              onChange={(e) => updateState({ rootName: e.target.value })}
            />
          </HStack>
          <HStack className="inputRow">
            <FormLabel className="labelWidth" textAlign="right">
              Collapse level
            </FormLabel>
            <NumberInput
              id="collapseInput"
              className="inputWidth"
              min={0}
              isDisabled={typeof state.collapseLevel !== 'number'}
              value={
                typeof state.collapseLevel === 'number' ? state.collapseLevel : 'Custom function'
              }
              onChange={(value) => updateState({ collapseLevel: Number(value) })}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </HStack>
          <HStack className="inputRow">
            <FormLabel className="labelWidth" textAlign="right">
              Collapse animation time
            </FormLabel>
            <NumberInput
              id="collapseTime"
              className="inputWidth"
              min={0}
              value={state.collapseTime}
              onChange={(value) => updateState({ collapseTime: Number(value) })}
            >
              <NumberInputField />
            </NumberInput>
          </HStack>
          <HStack className="inputRow">
            <FormLabel className="labelWidth" textAlign="right">
              Indent level
            </FormLabel>
            <NumberInput
              id="indentInput"
              className="inputWidth"
              max={12}
              min={0}
              value={state.indent}
              onChange={(value) => updateState({ indent: Number(value) })}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </HStack>
          <HStack className="inputRow">
            <FormLabel className="labelWidth" textAlign="right">
              Show counts
            </FormLabel>
            <div className="inputWidth" style={{ flexGrow: 1, maxWidth: 'max-content' }}>
              <Select
                id="showCountSelect"
                onChange={(e) =>
                  updateState({
                    showCount: e.target.value as
                      | 'Yes'
                      | 'No'
                      | 'When collapsed'
                      | 'When collapsed or filtered',
                  })
                }
                value={state.showCount}
                fontSize="sm"
              >
                <option value="Yes" key={0}>
                  Yes
                </option>
                <option value="No" key={1}>
                  No
                </option>
                <option value="When collapsed" key={2}>
                  When collapsed
                </option>
                <option value="When collapsed or filtered" key={3}>
                  When collapsed or filtered
                </option>
              </Select>
            </div>
          </HStack>
          <HStack className="inputRow">
            <FormLabel className="labelWidth" textAlign="right">
              Default new value
            </FormLabel>
            <Input
              className="inputWidth"
              disabled={activePayload?.defaultValue !== undefined}
              type="text"
              value={state.defaultNewValue}
              onChange={(e) => updateState({ defaultNewValue: e.target.value })}
            />
          </HStack>
          <CheckboxGroup colorScheme="primaryScheme">
            <Flex w="100%" justify="flex-start">
              <Checkbox
                id="allowEditCheckbox"
                isChecked={state.allowEdit}
                disabled={activePayload?.allowEdit !== undefined}
                onChange={() => toggleState('allowEdit')}
                w="50%"
              >
                Allow Edit
              </Checkbox>
              <Checkbox
                id="allowDeleteCheckbox"
                isChecked={state.allowDelete}
                disabled={activePayload?.allowDelete !== undefined}
                onChange={() => toggleState('allowDelete')}
                w="50%"
              >
                Allow Delete
              </Checkbox>
            </Flex>
            <Flex w="100%" justify="flex-start">
              <Checkbox
                id="allowAddCheckbox"
                isChecked={state.allowAdd}
                disabled={activePayload?.allowAdd !== undefined}
                onChange={() => toggleState('allowAdd')}
                w="50%"
              >
                Allow Add
              </Checkbox>
              <Checkbox
                id="allowCopyCheckbox"
                isChecked={state.allowCopy}
                onChange={() => toggleState('allowCopy')}
                w="50%"
              >
                Enable clipboard
              </Checkbox>
            </Flex>
            <Flex w="100%" justify="flex-start">
              <Checkbox
                id="showStringQuotesCheckbox"
                isChecked={state.showStringQuotes}
                onChange={() => toggleState('showStringQuotes')}
                w="50%"
              >
                Show String quotes
              </Checkbox>
              <Checkbox
                id="sortKeysCheckbox"
                isChecked={state.sortKeys}
                onChange={() => toggleState('sortKeys')}
                w="50%"
              >
                Sort Object keys
              </Checkbox>
            </Flex>
            <Flex w="100%" justify="flex-start">
              <Checkbox
                id="showIndexesCheckbox"
                isChecked={state.showIndexes}
                onChange={() => toggleState('showIndexes')}
                w="50%"
              >
                Show Array indexes
              </Checkbox>
              <Checkbox
                id="arraysFromOneCheckbox"
                isChecked={state.arraysFromOne}
                onChange={() => toggleState('arraysFromOne')}
                w="50%"
              >
                Arrays index from 1
              </Checkbox>
            </Flex>
            <Flex w="100%" justify="flex-start">
              <Checkbox
                id="showImperativeHandleCheckbox"
                isChecked={showExternalControl}
                disabled={!externalControlEnabled}
                onChange={() => setShowImperativeHandle((v) => !v)}
                w="50%"
              >
                Show External Control
              </Checkbox>
              <HStack w="50%">
                <Checkbox
                  id="customEditorCheckbox"
                  isChecked={state.customTextEditor}
                  onChange={() => toggleState('customTextEditor')}
                  disabled={!activePayload?.customTextEditorAvailable}
                >
                  Custom Text Editor
                </Checkbox>
                <Tooltip label="When in full JSON object edit">
                  <InfoIcon color="primaryScheme.500" />
                </Tooltip>
              </HStack>
            </Flex>
          </CheckboxGroup>
          {children}
        </VStack>
      </FormControl>
    </VStack>
    <Box maxW={350} pt={4}>
      {description}
    </Box>
    {exampleSlug && (
      <Link as={RouterLink} href={`/examples/${exampleSlug}`} color="accent" fontSize="sm">
        View the source code for this example
      </Link>
    )}
  </VStack>
)
