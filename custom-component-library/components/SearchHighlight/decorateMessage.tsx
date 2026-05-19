import React from 'react'

export interface DecorationSlice<TExtra = unknown> {
  a: number
  b: number
  extra?: TExtra
}

export type DecorationList<TExtra = unknown> = DecorationSlice<TExtra>[] & {
  active?: boolean
  allowSplit?: boolean
  callback?: (children: React.ReactNode, key: number, extra?: TExtra) => React.ReactNode
}

export type TextRenderer = (text: string, startPos: number) => React.ReactNode

export const decorateMessage = <TExtra,>(
  message: string,
  lists: Array<DecorationList<TExtra>>,
  renderText: TextRenderer = (text) => text,
): React.ReactNode => {
  let activeLists = lists
  let pos = 0

  const insertInOrder = (lst: DecorationList<TExtra>, s: DecorationSlice<TExtra>): void => {
    let i = 0
    while (i < lst.length && (lst[i].a < s.a || (lst[i].a === s.a && lst[i].b <= s.b))) i++
    lst.splice(i, 0, s)
  }

  const walkTo = (end: number): React.ReactNode => {
    const children = []

    loop: for (;;) {
      activeLists = activeLists.filter((list) => list.length !== 0)

      if (activeLists.length === 0) break

      let list = activeLists[0]
      for (let i = 1; i < activeLists.length; i++) {
        if (activeLists[i][0].a < list[0].a) list = activeLists[i]
      }

      if (list[0].a >= end) break

      if (list.active) {
        if (list.allowSplit) {
          let maxB = 0
          while (list.length > 0 && list[0].a < end) maxB = Math.max(maxB, list.shift()!.b)
          if (maxB > end) {
            if (list.length > 0 && list[0].a === end) list[0].b = Math.max(list[0].b, maxB)
            else list.unshift({ a: end, b: maxB } as DecorationSlice<TExtra>)
          }
        } else {
          list[0].a = end
        }
        continue
      }

      const { a, b: bOrig, extra } = list.shift()!
      let b = bOrig

      if (b > end) {
        if (list.allowSplit) {
          insertInOrder(list, { a: end, b: bOrig, extra } as DecorationSlice<TExtra>)
          b = end
        } else {
          continue
        }
      }
      if (list.allowSplit) {
        for (let i = 0; activeLists[i] !== list; i++) {
          for (const item of activeLists[i]) {
            if (item.a >= b) break
            if (item.a > a && item.b > b) {
              insertInOrder(list, { a: item.a, b, extra } as DecorationSlice<TExtra>)
              b = item.a
            }
          }
        }
      }
      for (let i = 0; activeLists[i] !== list; i++) {
        for (const item of activeLists[i]) {
          if (item.a >= b) break
          else if (item.b > b) continue loop
        }
      }

      if (pos >= b) continue
      if (pos < a) {
        children.push(renderText(message.slice(pos, a), pos))
        pos = a
      }
      list.active = true
      children.push(list.callback!(walkTo(b), pos, extra))
      list.active = false
    }

    if (pos < end) {
      children.push(renderText(message.slice(pos, end), pos))
      pos = end
    }

    return children.length === 1 ? children[0] : children
  }

  return message ? walkTo(message.length) : message
}
