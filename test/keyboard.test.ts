import { type MutableRefObject } from 'react'
import {
  getFullKeyboardControlMap,
  getNextOrPrevious,
  insertCharInTextArea,
} from '../src/utils/keyboard'

describe('insertCharInTextArea', () => {
  // Mirrors how the editor's textarea is populated when it opens: setting
  // `.textContent` populates both `.value` and `.textContent` in jsdom (as a
  // controlled React textarea does at mount), which is the state these hotkeys
  // fire in. The element must be attached for selection APIs to apply.
  const setup = (content: string, selStart: number, selEnd = selStart) => {
    const textArea = document.createElement('textarea')
    document.body.appendChild(textArea)
    textArea.textContent = content
    textArea.setSelectionRange(selStart, selEnd)
    return { textArea, ref: { current: textArea } as MutableRefObject<HTMLTextAreaElement> }
  }

  afterEach(() => {
    document.body.innerHTML = ''
  })

  test('inserts the character at a collapsed caret and writes it back to the textarea', () => {
    const { textArea, ref } = setup('abcdef', 3)
    const result = insertCharInTextArea(ref, '\t')
    expect(result).toBe('abc\tdef')
    expect(textArea.value).toBe('abc\tdef')
  })

  test('advances the caret to immediately after the inserted character', () => {
    const { textArea, ref } = setup('abcdef', 3)
    insertCharInTextArea(ref, '\t')
    expect(textArea.selectionStart).toBe(4)
    expect(textArea.selectionEnd).toBe(4)
  })

  test('inserts at the very start of the content', () => {
    const { ref } = setup('abcdef', 0)
    expect(insertCharInTextArea(ref, '\n')).toBe('\nabcdef')
  })

  test('inserts at the very end of the content', () => {
    const { ref } = setup('abcdef', 6)
    expect(insertCharInTextArea(ref, '\n')).toBe('abcdef\n')
  })

  test('replaces the active selection when start and end differ', () => {
    const { textArea, ref } = setup('abcdef', 1, 4) // selection spans 'bcd'
    const result = insertCharInTextArea(ref, '\t')
    expect(result).toBe('a\tef')
    expect(textArea.value).toBe('a\tef')
    expect(textArea.selectionStart).toBe(2)
  })

  test('operates on the live value after the field has been edited, not the original content', () => {
    // A textarea's `.textContent` reflects its original (default) content,
    // while `.value` tracks live edits — they diverge once the user types.
    // Setting both here reproduces that post-edit state.
    const textArea = document.createElement('textarea')
    document.body.appendChild(textArea)
    textArea.textContent = 'original' // stale default content
    textArea.value = 'edited text' // current, edited value
    textArea.setSelectionRange(6, 6) // caret just after 'edited'
    const ref = { current: textArea } as MutableRefObject<HTMLTextAreaElement>

    const result = insertCharInTextArea(ref, '\t')
    expect(result).toBe('edited\t text')
    expect(textArea.value).toBe('edited\t text')
  })
})

describe('getFullKeyboardControlMap', () => {
  test('leaves value-node confirm keys at their defaults when no controls are supplied', () => {
    const controls = getFullKeyboardControlMap({})
    expect(controls.confirm).toEqual({ key: 'Enter' })
    expect(controls.stringConfirm).toEqual({ key: 'Enter' })
    expect(controls.numberConfirm).toEqual({ key: 'Enter' })
    expect(controls.booleanConfirm).toEqual({ key: 'Enter' })
  })

  test('propagates a generic "confirm" override to all value-node confirm keys', () => {
    const controls = getFullKeyboardControlMap({ confirm: 'Tab' })
    expect(controls.confirm).toEqual({ key: 'Tab' })
    expect(controls.stringConfirm).toEqual({ key: 'Tab' })
    expect(controls.numberConfirm).toEqual({ key: 'Tab' })
    expect(controls.booleanConfirm).toEqual({ key: 'Tab' })
  })

  test('does not override a value-node confirm key that is explicitly defined', () => {
    const controls = getFullKeyboardControlMap({ confirm: 'Tab', stringConfirm: 'a' })
    expect(controls.stringConfirm).toEqual({ key: 'a' })
    // Others still fall back to the generic confirm
    expect(controls.numberConfirm).toEqual({ key: 'Tab' })
    expect(controls.booleanConfirm).toEqual({ key: 'Tab' })
  })
})

describe('getNextOrPrevious', () => {
  // Tests in this block exercise the pure STRUCTURAL walk — pass an
  // always-true `isViable` predicate so every candidate is accepted and
  // the result reflects raw document order. The viability-skipping
  // behaviour itself is tested separately under `describe('isViable predicate')` below.
  const acceptAll = () => true
  const getNext = (data: object, path: (string | number)[]) =>
    getNextOrPrevious(data, path, 'next', () => {}, acceptAll)
  const getPrevious = (data: object, path: (string | number)[]) =>
    getNextOrPrevious(data, path, 'prev', () => {}, acceptAll)

  const data = {
    a: 1,
    b: 'something',
    cee: 99,
    dee: {
      inner: 'value',
      inner2: 45,
      inner3: {
        innerDeep: 2.4,
        innerDeep2: [1, 2, 3],
        innerBool: false,
        innerArray: [
          { one: 1, two: 'two', three: true, four: null, five: true },
          { one: 'one', two: 2, three: 3, four: { one: 1 }, 45: 'Number' },
        ],
      },
    },
    obj2: { 1: true, 2: 'two' },
    arr: [1, 'two', { three: 4 }, false, undefined, null, 7, 8, 9, 10, 11, 12],
  }

  test('Root level', () => {
    const curr = ['a']
    expect(getNext(data, curr)).toEqual(['b'])
    expect(getPrevious(data, curr)).toEqual(null)
  })

  test('Inside object', () => {
    expect(getNext(data, ['dee', 'inner'])).toEqual(['dee', 'inner2'])
    expect(getPrevious(data, ['dee', 'inner2'])).toEqual(['dee', 'inner'])
  })

  test('Next traverses object, one level', () => {
    expect(getNext(data, ['dee', 'inner2'])).toEqual(['dee', 'inner3', 'innerDeep'])
    expect(getPrevious(data, ['dee', 'inner3', 'innerDeep'])).toEqual(['dee', 'inner2'])
  })

  test('Next traverses object, multi-level, incl. Array', () => {
    expect(getNext(data, ['dee', 'inner3', 'innerBool'])).toEqual([
      'dee',
      'inner3',
      'innerArray',
      0,
      'one',
    ])
    expect(getPrevious(data, ['dee', 'inner3', 'innerArray', 0, 'one'])).toEqual([
      'dee',
      'inner3',
      'innerBool',
    ])
  })

  test('Traverse from within array', () => {
    expect(getNext(data, ['dee', 'inner3', 'innerDeep2', 1])).toEqual([
      'dee',
      'inner3',
      'innerDeep2',
      2,
    ])
    expect(getPrevious(data, ['dee', 'inner3', 'innerDeep2', 1])).toEqual([
      'dee',
      'inner3',
      'innerDeep2',
      0,
    ])
    expect(getNext(data, ['dee', 'inner3', 'innerDeep2', 2])).toEqual([
      'dee',
      'inner3',
      'innerBool',
    ])
    expect(getPrevious(data, ['dee', 'inner3', 'innerDeep2', 0])).toEqual([
      'dee',
      'inner3',
      'innerDeep',
    ])
  })

  test('Traverse into empty object/array', () => {
    const d = {
      displayName: 'Default',
      styles: {
        container: {
          backgroundColor: '#f6f6f6',
          fontFamily: 'monospace',
        },
        collection: {},
        collectionInner: [],
        lastOne: 1,
        empty: {},
      },
    }
    expect(getNext(d, ['styles', 'container', 'fontFamily'])).toEqual(['styles', 'lastOne'])
    expect(getNext(d, ['styles', 'lastOne'])).toEqual(null)
  })

  describe('isViable predicate', () => {
    // The predicate receives a synthesized NodeData per candidate leaf and
    // returns true to accept that leaf, false to skip onward. This is how
    // Tab navigation now skips filtered-out / non-editable nodes up front,
    // replacing the redirect useLayoutEffect that previously bounced edits
    // reactively in ValueNodeWrapper.
    const sample = { a: 1, b: 2, c: 3, d: 4, e: 5 }

    test('skips a single non-viable leaf forward and back', () => {
      // Skip `c` going forward and back.
      const isViable = (nd: { key: string | number }) => nd.key !== 'c'
      expect(getNextOrPrevious(sample, ['b'], 'next', () => {}, isViable)).toEqual(['d'])
      expect(getNextOrPrevious(sample, ['d'], 'prev', () => {}, isViable)).toEqual(['b'])
    })

    test('skips a contiguous run of non-viable leaves', () => {
      // Skip b, c, d going forward; should land on e.
      const isViable = (nd: { key: string | number }) =>
        !(['b', 'c', 'd'] as Array<string | number>).includes(nd.key)
      expect(getNextOrPrevious(sample, ['a'], 'next', () => {}, isViable)).toEqual(['e'])
      // And reverse: from e back, skip d, c, b — land on a.
      expect(getNextOrPrevious(sample, ['e'], 'prev', () => {}, isViable)).toEqual(['a'])
    })

    test('returns null when nothing viable remains in the search direction', () => {
      const isViable = (nd: { key: string | number }) => nd.key === 'a'
      // From `a`, no more `a` siblings forward → null.
      expect(getNextOrPrevious(sample, ['a'], 'next', () => {}, isViable)).toEqual(null)
      // From `a`, no `a` siblings before either → null.
      expect(getNextOrPrevious(sample, ['a'], 'prev', () => {}, isViable)).toEqual(null)
    })

    test('viability check sees the candidate NodeData shape, not the source', () => {
      // The predicate inspects the CANDIDATE leaf (the proposed Tab
      // destination), not the source. Asserts the synthesized shape
      // carries path, level, value, parentData, fullData so custom
      // searchFilter / allowEdit functions get what they expect.
      const seen: Array<{ key: unknown; path: unknown; level: unknown; value: unknown }> = []
      const isViable = (nd: { key: unknown; path: unknown; level: unknown; value: unknown }) => {
        seen.push({ key: nd.key, path: nd.path, level: nd.level, value: nd.value })
        return true
      }
      getNextOrPrevious(sample, ['a'], 'next', () => {}, isViable)
      // First candidate from ['a'] going next is ['b'] (a leaf, value 2).
      expect(seen[0]).toEqual({ key: 'b', path: ['b'], level: 1, value: 2 })
    })

    test('descends into a collection and skips a non-viable first leaf', () => {
      // Tab from a leaf into a nested collection — viability is checked on
      // the deepest first leaf reached by getChildRecursive, and skipped
      // onward if non-viable.
      const nested = { a: 1, b: { x: 'skip-me', y: 'ok' }, c: 3 }
      const isViable = (nd: { value: unknown }) => nd.value !== 'skip-me'
      expect(getNextOrPrevious(nested, ['a'], 'next', () => {}, isViable)).toEqual(['b', 'y'])
    })
  })
})
