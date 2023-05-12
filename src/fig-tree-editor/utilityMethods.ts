import clone from 'just-clone'

export const isCollection = (value: unknown) => value !== null && typeof value == 'object'

export const updateDataObject = (
  data: object,
  path: (string | number)[],
  newValue: unknown,
  action: 'update' | 'delete'
) => {
  if (path.length === 0) {
    return {
      currentData: data,
      newData: newValue as object,
      currentValue: data,
      newValue: newValue,
    }
  }

  const newData = clone(data)

  let d = newData
  let currentValue
  for (let i = 0; i < path.length; i++) {
    const part = path[i]
    if (i === path.length - 1) {
      currentValue = (d as any)[part]
      // @ts-ignore
      if (action === 'update') d[part] = newValue
      // @ts-ignore
      if (action === 'delete') delete d[part]
    }
    d = (d as any)[part]
  }
  return {
    currentData: data,
    newData,
    currentValue,
    newValue: action === 'update' ? newValue : undefined,
  }
}
