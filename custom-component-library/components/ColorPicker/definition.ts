import { type CustomNodeDefinition } from '@json-edit-react'
import { ColorPickerComponent, ColorPickerProps } from './component'
import { colord } from 'colord'

export const ColorPickerNodeDefinition: CustomNodeDefinition<ColorPickerProps> = {
  condition: ({ value }) => typeof value === 'string' && colord(value).isValid(),
  element: ColorPickerComponent,
  name: 'Color Picker',
  // customNodeProps: {},
  showOnView: true,
  showOnEdit: true,
  showInTypesSelector: true,
  defaultValue: '#ff69B4', // Hot Pink!
  passOriginalNode: true,
}
