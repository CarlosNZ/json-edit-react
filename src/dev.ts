const regexp = /yes/

const matchFunction = (key: string, value: unknown): boolean => regexp.test(key)
//   || regexp.test(String(value))

const filterData = (data: unknown, pred: typeof matchFunction): any => {
  if (data === null) return data

  if (Array.isArray(data)) {
    return data.filter((e) => {
      const filtered = filterData(e, pred)
      if (typeof filtered === 'object' && filtered !== null) return Object.keys(filtered).length > 0
      return false
    })
  }

  if (typeof data === 'object') {
    const keyValArray = Object.entries(data)

    const newObj: any = {}
    keyValArray.forEach(([key, value]) => {
      if (pred(key, value)) {
        newObj[key] = value
        return
      }
      if (Array.isArray(value)) {
        const child = value.map((e) => filterData(e, pred))
        if (child.length > 0) newObj[key] = child
      }
      if (typeof value === 'object') {
        const newChild = filterData(value, pred)
        if (Object.keys(newChild).length > 0) newObj[key] = newChild
      }
    })

    return newObj
  }

  return data
}

const data = {
  yesSir: [1, 2, { yes: 1 }],
  not: [4, 4, [{ yes: 1 }, { no: 0 }]],
  yes: 1,
  no: 0,
  nnn: { nnn: 0, n2: { yes: 1, no: 0 } },
  yesyes: { yes: 1, no: { no: 'no', yes: 'yes' } },
}

console.log(
  JSON.stringify(
    filterData({ yesyes: { yes: 1, no: { no: 'no', yes: 'yes' } } }, matchFunction),
    null,
    2
  )
)
