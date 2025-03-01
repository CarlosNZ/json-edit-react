import { useEffect } from 'react'
import { useTreeState } from '../contexts'
import { type CollectionKey } from '../types'
import { toPathString } from '../helpers'

export interface EditState {
  path?: CollectionKey[]
  action?: 'accept' | 'cancel'
}

export interface CollapseState {
  path: CollectionKey[]
  collapsed: boolean
  includeChildren: boolean
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
    console.log('Trigger....')
    if (!triggers) return

    console.log('Processing triggers', triggers)
    const { collapse, edit } = triggers

    if (Array.isArray(collapse)) {
      return // For now
    }

    if (collapse) setCollapseState(collapse)

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
