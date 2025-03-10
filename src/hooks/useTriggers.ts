/**
 * Hook to handle changes to the `externalTriggers` prop in order to set
 * "collapse" state, as well as start/stop editing
 */

import { useEffect } from 'react'
import { useTreeState } from '../contexts'
import { type CollectionKey, type CollapseState } from '../types'
import { toPathString } from '../helpers'

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
  editConfirmRef: React.RefObject<HTMLDivElement>
) => {
  const { setCurrentlyEditingElement, currentlyEditingElement, setCollapseState } = useTreeState()

  useEffect(() => {
    if (!triggers) return

    const { collapse, edit } = triggers

    // COLLAPSE

    if (collapse) {
      setCollapseState(collapse)
    }

    // EDIT

    const doesPathMatch = edit?.path ? toPathString(edit.path) === currentlyEditingElement : true

    switch (edit?.action) {
      case 'accept': {
        if (doesPathMatch) {
          if (editConfirmRef.current) editConfirmRef.current.click()
          setCurrentlyEditingElement(null)
        }

        break
      }
      case 'cancel': {
        if (doesPathMatch) setCurrentlyEditingElement(null)
        break
      }
      default: {
        if (edit?.path) setCurrentlyEditingElement(edit.path)
      }
    }
  }, [triggers])
}
