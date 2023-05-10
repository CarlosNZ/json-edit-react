import { DataNode } from '.'

export const updateObjectPath = (data: DataNode, path: (string | number)[], newValue: unknown) => {
  let d = data
  path.forEach((part, index) => {
    if (index === path.length - 1) {
      const idx =
        typeof part === 'number'
          ? index
          : (d.value as DataNode[]).findIndex((node) => node.key === part)
      const currentValue = (d.value as DataNode[])[idx].value
      //   const
    }
  })
}
