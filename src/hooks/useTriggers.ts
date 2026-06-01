/**
 * Hook to handle changes to the `externalTriggers` prop in order to set
 * "collapse" state, as well as start/stop editing
 */

import { useEffect } from 'react'
import { useEditingStore, useCollapse } from '../contexts'
import { type CollectionKey, type CollapseState } from '../types'
import { pathsEqual } from '../utils/pathTools'

export interface EditState {
  path?: CollectionKey[]
  action?: 'accept' | 'cancel'
}

export interface ExternalTriggers {
  collapse?: CollapseState | CollapseState[]
  edit?: EditState
}

export const useTriggers = (
  triggers: ExternalTriggers | null | undefined,
  editConfirmRef: React.RefObject<HTMLDivElement | null>
) => {
  const { startEdit, cancelEdit, getSnapshot } = useEditingStore()
  const { setCollapseState } = useCollapse()

  useEffect(() => {
    if (!triggers) return

    const { collapse, edit } = triggers
    // Read the current editing target imperatively — this hook lives in the
    // root Editor, so subscribing here would re-render the whole tree.
    const { currentlyEditingElement } = getSnapshot()

    // COLLAPSE

    if (collapse) {
      setCollapseState(collapse)
    }

    // EDIT

    const doesPathMatch = edit?.path
      ? currentlyEditingElement !== null && pathsEqual(edit.path, currentlyEditingElement.path)
      : true

    switch (edit?.action) {
      case 'accept': {
        if (doesPathMatch) {
          if (editConfirmRef.current) editConfirmRef.current.click()
          cancelEdit()
        }

        break
      }
      case 'cancel': {
        if (doesPathMatch) cancelEdit()
        break
      }
      default: {
        if (edit?.path) startEdit(edit.path)
      }
    }
    // `triggers` is the only intended trigger. Including the editing setters
    // or `currentlyEditingElement` would re-run the effect on every edit
    // transition and re-broadcast the *last* triggers payload — wrong.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggers])
}
