import { type CustomNodeDefinition } from '@json-edit-react'
import { ColorPickerComponent, ColorPickerProps } from './component'

const hexCodeRegex = /^#[0-9A-Fa-f]{6}$/

export const ColorPickerNodeDefinition: CustomNodeDefinition<ColorPickerProps> = {
  condition: ({ value }) => typeof value === 'string' && hexCodeRegex.test(value),
  element: ColorPickerComponent,
  name: 'Color Picker',
  // customNodeProps: {},
  showOnView: false,
  showOnEdit: true,
  showInTypesSelector: true,
  defaultValue: '#ffffff',
}
