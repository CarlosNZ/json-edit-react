export { JsonEditor } from './JsonEditor'
export { defaultTheme } from './contexts/ThemeProvider'
export { IconAdd, IconEdit, IconDelete, IconCopy, IconOk, IconCancel, IconChevron } from './Icons'
export { StringDisplay, StringEdit, useKeyboardListener } from './ValueNodes'
export { LinkCustomComponent, LinkCustomNodeDefinition } from './customComponents'
export { matchNode, matchNodeKey, isCollection, toPathString } from './helpers'
export { default as assign } from 'object-property-assigner'
export { default as extract } from 'object-property-extractor'
export {
  standardDataTypes,
  type JsonEditorProps,
  type UpdateFunction,
  type OnChangeFunction,
  type OnErrorFunction,
  type OnEditEventFunction,
  type OnCollapseFunction,
  type JerError,
  type DataType,
  type CopyFunction,
  type FilterFunction,
  type SearchFilterFunction,
  type TypeFilterFunction,
  type NewKeyOptionsFunction,
  type DefaultValueFunction,
  type CompareFunction,
  type IconReplacements,
  type CollectionNodeProps,
  type ValueNodeProps,
  type CustomNodeProps,
  type CustomNodeDefinition,
  type CustomTextDefinitions,
  type CustomTextFunction,
  type Theme,
  type ThemeInput,
  type ThemeStyles,
  type NodeData,
  type JsonData,
  type KeyboardControls,
  type TextEditorProps,
  type CollapseState,
  type EnumDefinition,
  type ErrorString,
  type TypeOptions,
  type UpdateFunctionProps,
} from './types'
export { type EditState, type ExternalTriggers } from './hooks'
export { type IconProps } from './Icons'
export { type LocalisedStrings, type TranslateFunction } from './localisation'

export {
  githubDarkTheme,
  githubLightTheme,
  monoDarkTheme,
  monoLightTheme,
  candyWrapperTheme,
  psychedelicTheme,
} from './additionalThemes'
