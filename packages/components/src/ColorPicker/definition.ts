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
  fromStandardType: (value, _, componentProps) => {
    const { keepAsColor = true, invalidColorError = 'Invalid Color' } = componentProps ?? {}
    if (keepAsColor && !colord(String(value)).isValid())
      // Rejects the confirm; at switch time core seeds the raw text instead
      throw new Error(invalidColorError)
    return String(value ?? '')
  },
}
