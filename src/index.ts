export { JsonEditor } from './JsonEditor'
export { defaultTheme } from './contexts/ThemeProvider'
export { IconAdd, IconEdit, IconDelete, IconCopy, IconOk, IconCancel, IconChevron } from './Icons'
export { StringDisplay } from './ValueNodes'
export { LinkCustomComponent, LinkCustomNodeDefinition } from './customComponents'
export { matchNode, matchNodeKey, isCollection } from './helpers'
export { default as assign } from 'object-property-assigner'
export { default as extract } from 'object-property-extractor'
export {
  type JsonEditorProps,
  type UpdateFunction,
  type OnChangeFunction,
  type OnErrorFunction,
  type JerError,
  type DataType,
  type CopyFunction,
  type FilterFunction,
  type SearchFilterFunction,
  type TypeFilterFunction,
  type CompareFunction,
  type IconReplacements,
  type CollectionNodeProps,
  type ValueNodeProps,
  type CustomNodeProps,
  type CustomNodeDefinition,
  type CustomTextDefinitions,
  type CustomTextFunction,
  type DefaultValueFunction,
  type Theme,
  type ThemeInput,
  type ThemeStyles,
  type NodeData,
  type JsonData,
  type KeyboardControls,
  type TextEditorProps,
} from './types'
export { type LocalisedStrings, type TranslateFunction } from './localisation'

export {
  githubDarkTheme,
  githubLightTheme,
  monoDarkTheme,
  monoLightTheme,
  candyWrapperTheme,
  psychedelicTheme,
} from './additionalThemes'
