import JsonEditor from './JsonEditor'
import {
  type JsonEditorProps,
  type UpdateFunction,
  type OnChangeFunction,
  type OnErrorFunction,
  type JerError,
  type CopyFunction,
  type FilterFunction,
  type SearchFilterFunction,
  type CompareFunction,
  type IconReplacements,
  type CollectionNodeProps,
  type ValueNodeProps,
  type CustomNodeProps,
  type CustomNodeDefinition,
  type CustomTextDefinitions,
  type ThemeName,
  type Theme,
  type ThemeInput,
  type NodeData,
} from './types'
import { type LocalisedStrings, type TranslateFunction } from './localisation'
import { themes } from './theme'
import { IconAdd, IconEdit, IconDelete, IconCopy, IconOk, IconCancel, IconChevron } from './Icons'
import { LinkCustomComponent, LinkCustomNodeDefinition } from './customComponents'
import { truncate } from './ValueNodes'
import { matchNode, matchNodeKey, isCollection } from './filterHelpers'
import assign from 'object-property-assigner'
import extract from 'object-property-extractor'

export {
  JsonEditor,
  themes,
  type ThemeName,
  type Theme,
  type ThemeInput,
  type JsonEditorProps,
  type UpdateFunction,
  type OnChangeFunction,
  type OnErrorFunction,
  type JerError,
  type CopyFunction,
  type FilterFunction,
  type SearchFilterFunction,
  type CompareFunction,
  type NodeData,
  type IconReplacements,
  type LocalisedStrings,
  type TranslateFunction,
  type CollectionNodeProps,
  type ValueNodeProps,
  type CustomNodeProps,
  type CustomNodeDefinition,
  type CustomTextDefinitions,
  LinkCustomComponent,
  LinkCustomNodeDefinition,
  IconAdd,
  IconEdit,
  IconDelete,
  IconCopy,
  IconOk,
  IconCancel,
  IconChevron,
  matchNode,
  matchNodeKey,
  isCollection,
  truncate,
  assign,
  extract,
}
