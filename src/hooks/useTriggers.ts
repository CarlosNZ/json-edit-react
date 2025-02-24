import { useEffect } from 'react'
import { useTreeState, type CollapseAllState } from '../contexts'
import { type CollectionKey } from '../types'
import { toPathString } from '../helpers'

export interface EditState {
  path?: CollectionKey[]
  action?: 'accept' | 'cancel'
}

export interface ExternalTriggers {
  collapse?: CollapseAllState | CollapseAllState[]
  edit?: EditState
}

export const useTriggers = (
  triggers: ExternalTriggers | null | undefined,
  editConfirmRef: React.RefObject<HTMLDivElement>
) => {
  const { setCurrentlyEditingElement, currentlyEditingElement, setCollapseState } = useTreeState()

  useEffect(() => {
    console.log('Trigger....')
    if (!triggers) return

    console.log('Processing triggers', triggers)
    const { collapse, edit } = triggers

    if (Array.isArray(collapse)) {
      return // For now
    }

    if (collapse) setCollapseState(collapse)

    const isPathIncluded = edit?.path ? toPathString(edit.path) === currentlyEditingElement : true

    switch (edit?.action) {
      case 'accept': {
        if (isPathIncluded) {
          if (editConfirmRef.current) editConfirmRef.current.click()
          setCurrentlyEditingElement(null)
        }

        break
      }
      case 'cancel': {
        if (isPathIncluded) setCurrentlyEditingElement(null)
        break
      }
      default: {
        if (edit?.path) setCurrentlyEditingElement(edit.path)
      }
    }
  }, [triggers])
}
