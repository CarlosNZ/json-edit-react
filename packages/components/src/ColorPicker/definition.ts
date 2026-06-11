import { type CustomNodeDefinition } from 'json-edit-react'
import { ColorPickerComponent, ColorPickerProps } from './component'
import { colord } from 'colord'

export const ColorPickerNodeDefinition: CustomNodeDefinition<ColorPickerProps> = {
  condition: ({ value }) => typeof value === 'string' && colord(value).isValid(),
  component: ColorPickerComponent,
  name: 'Color Picker',
  // componentProps: {},
  showOnView: true,
  showOnEdit: true,
  showInTypeSelector: true,
  editOnTypeSwitch: true,
  defaultValue: '#ff69B4', // Hot Pink!
  passOriginalNode: true,
  // Invalid colour text still seeds the input for the user to fix —
  // `fromEditBuffer` enforces `keepAsColor` at commit
  fromStandardType: (value) => String(value ?? ''),
  fromEditBuffer: (buffer, _, componentProps) => {
    const { keepAsColor = true, invalidColorError = 'Invalid Color' } = componentProps ?? {}
    if (keepAsColor && !colord(String(buffer)).isValid()) throw new Error(invalidColorError)
    return buffer
  },
}
