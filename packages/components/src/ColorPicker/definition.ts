import { type CustomNodeDefinition } from 'json-edit-react'
import { createDefinitionFactory } from '../_common/createDefinitionFactory'
import { ColorPickerComponent, ColorPickerProps } from './component'
import { colord } from 'colord'

// The condition doubles as the guard: consumer `condition` overrides are
// targeting, ANDed with this by the factory; replacing it requires the
// explicit `guard` override.
const ColorPickerNodeDefinition: CustomNodeDefinition<ColorPickerProps> = {
  condition: ({ value }) => typeof value === 'string' && colord(value).isValid(),
  component: ColorPickerComponent,
  name: 'Color Picker',
  showOnView: true,
  showOnEdit: true,
  showInTypeSelector: true,
  editOnTypeSwitch: true,
  defaultValue: '#ff69B4', // Hot Pink!
  passOriginalNode: true,
  fromStandardType: (value, _, componentProps) => {
    const { keepAsColor = true, invalidColorError = 'Invalid Color' } = componentProps ?? {}
    if (keepAsColor && !colord(String(value)).isValid())
      // Rejects the confirm; at switch time core seeds defaultValue instead
      throw new Error(invalidColorError)
    return String(value ?? '')
  },
}

export const colorPickerDefinition = createDefinitionFactory(ColorPickerNodeDefinition)
