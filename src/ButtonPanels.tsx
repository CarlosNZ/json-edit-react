import React, { useState } from 'react'
import { extract } from './utils/extract'
import { Icon } from './Icons'
import { useTheme } from './contexts'
import { type TranslateFunction } from './localisation'
import {
  type CollectionKey,
  type CollectionDataType,
  type CopyType,
  type NodeData,
  type CustomButtonDefinition,
  type KeyboardControlsFull,
  type OnCopyFunction,
  type EventInterceptFunction,
  JsonData,
  OnEditEventFunction,
} from './types'
import { getModifier } from './utils/keyboard'

interface EditButtonProps {
  startEdit?: () => void
  handleDelete?: () => void
  allowClipboard: boolean
  onCopy?: OnCopyFunction
  onEventIntercept?: EventInterceptFunction
  confirmInterceptBypassRef: React.RefObject<boolean>
  handleAdd?: (newKey: string) => void
  type?: CollectionDataType
  nodeData: NodeData
  translate: TranslateFunction
  customButtons: CustomButtonDefinition[]
  keyboardControls: KeyboardControlsFull
  handleKeyboard: (
    e: React.KeyboardEvent,
    eventMap: Partial<Record<keyof KeyboardControlsFull, () => void>>
  ) => void
  getNewKeyOptions?: (nodeDate: NodeData) => string[] | null | void
  editConfirmRef: React.RefObject<HTMLDivElement | null>
  jsonStringify: (
    data: JsonData,
    // eslint-disable-next-line
    replacer?: (this: any, key: string, value: unknown) => string
  ) => string
  onEditEvent?: OnEditEventFunction
  showIconTooltips: boolean
}

export const EditButtons: React.FC<EditButtonProps> = ({
  startEdit,
  handleDelete,
  handleAdd,
  allowClipboard,
  onCopy,
  onEventIntercept,
  confirmInterceptBypassRef,
  type,
  customButtons,
  nodeData,
  translate,
  keyboardControls,
  handleKeyboard,
  editConfirmRef,
  getNewKeyOptions,
  jsonStringify,
  onEditEvent,
  showIconTooltips,
}) => {
  const { getStyles } = useTheme()
  const NEW_KEY_PROMPT = translate('KEY_NEW', nodeData)
  const [newKey, setNewKey] = useState(NEW_KEY_PROMPT)

  // This value indicates whether the user is adding a new key to an object.
  // Normally such an indicator would be a boolean, but in this case it can also
  // be an array of strings. This is to avoid having to have a separate state
  // value for the list of key options as well as an "are we adding a key?"
  // state value.
  const [addingKeyState, setAddingKeyState] = useState<string[] | boolean>(false)

  const { path, value: data } = nodeData

  const hasKeyOptionsList = Array.isArray(addingKeyState)

  const updateAddingState = (active: boolean) => {
    // Add 'null' to the path to indicate that the actual path of where the new
    // key will go is not yet known.
    // Also, "active" matches the second "isKey" parameter here, even though it
    // describes a different thing.
    if (onEditEvent) onEditEvent(active ? [...path, null] : null, active)

    if (!active) {
      setAddingKeyState(false)
      return
    }

    // Don't show keys that already exist in the object. This reads the node's
    // OWN subtree (by `path`), which structural sharing keeps consistent even if
    // `fullData` is a stale bailed reference — so no `getLatestData()` needed
    // here (unlike the event-time whole-document reads in onChange/onError/Tab).
    const existingKeys = Object.keys(extract(nodeData.fullData, path) as object)

    const options = getNewKeyOptions
      ? getNewKeyOptions(nodeData)?.filter((key) => !existingKeys.includes(key))
      : null
    if (options) setNewKey('')
    setAddingKeyState(options ?? true)
  }

  // Gated commit of a new (object) key. Used by every add-confirm affordance
  // (Enter, the key-options select, the tick). Returning truthy suppresses the
  // add and leaves the key input open; `editorRef.confirmEdit()` sets the bypass
  // ref to resume below the gate.
  const handleConfirmAdd = async (key: string) => {
    if (confirmInterceptBypassRef.current) {
      confirmInterceptBypassRef.current = false
    } else if (onEventIntercept) {
      if (await onEventIntercept({ ...nodeData, event: 'confirmAdd', newKey: key })) return
    }
    updateAddingState(false)
    handleAdd?.(key)
    setNewKey(NEW_KEY_PROMPT)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    handleKeyboard(e, {
      stringConfirm: () => {
        if (handleAdd) handleConfirmAdd(newKey)
      },
      cancel: () => {
        updateAddingState(false)
        setNewKey(NEW_KEY_PROMPT)
      },
    })
  }

  const handleCopy = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    let copyType: CopyType = 'value'
    let value: unknown
    let stringValue = ''
    let success: boolean
    let errorMessage: string | null = null
    if (allowClipboard) {
      const modifier = getModifier(e)
      if (modifier && keyboardControls.clipboardModifier.includes(modifier)) {
        value = stringifyPath(path)
        stringValue = value as string
        copyType = 'path'
      } else {
        value = data
        stringValue = typeof value === 'object' ? jsonStringify(data) : String(value)
      }
      if (!navigator.clipboard) {
        onCopy?.({
          ...nodeData,
          success: false,
          stringValue,
          type: copyType,
          error: { message: "Can't access clipboard API" },
        })
        return
      }
      navigator.clipboard
        ?.writeText(stringValue)
        .then(() => (success = true))
        .catch((err) => {
          success = false
          errorMessage = err.message
        })
        .finally(() => {
          onCopy?.({
            ...nodeData,
            success,
            stringValue,
            type: copyType,
            error: success ? undefined : { message: errorMessage ?? 'Copy failed' },
          })
        })
    }
  }

  // Soft gate: returns true when the consumer takes the action over (suppress).
  // `startEdit` is gated by the parent node before it reaches here; the instant
  // `delete` and the `startAdd` interaction are gated at their click below.
  // Guarding on `onEventIntercept` keeps the no-interceptor path synchronous.
  const isIntercepted = async (event: 'delete' | 'startAdd') =>
    !!(onEventIntercept && (await onEventIntercept({ ...nodeData, event })))

  return (
    <div
      className="jer-edit-buttons"
      style={{ opacity: addingKeyState ? 1 : undefined }}
      onClick={(e) => e.stopPropagation()}
    >
      {allowClipboard && (
        <div
          onClick={handleCopy}
          className="jer-copy-pulse"
          title={showIconTooltips ? translate('TOOLTIP_COPY', nodeData) : ''}
        >
          <Icon name="copy" nodeData={nodeData} />
        </div>
      )}
      {startEdit && (
        <div
          onClick={startEdit}
          title={showIconTooltips ? translate('TOOLTIP_EDIT', nodeData) : ''}
        >
          <Icon name="edit" nodeData={nodeData} />
        </div>
      )}
      {handleDelete && (
        <div
          onClick={async () => {
            if (await isIntercepted('delete')) return
            handleDelete?.()
          }}
          title={showIconTooltips ? translate('TOOLTIP_DELETE', nodeData) : ''}
        >
          <Icon name="delete" nodeData={nodeData} />
        </div>
      )}
      {handleAdd && (
        <div
          onClick={async () => {
            if (await isIntercepted('startAdd')) return
            if (type === 'object') updateAddingState(true)
            // For arrays, we don't need to add a key
            else handleAdd?.('')
          }}
          title={showIconTooltips ? translate('TOOLTIP_ADD', nodeData) : ''}
        >
          <Icon name="add" nodeData={nodeData} />
        </div>
      )}
      {customButtons?.map(({ Element, onClick }, i) => (
        <div key={i} onClick={(e) => onClick && onClick(nodeData, e)}>
          <Element nodeData={nodeData} />
        </div>
      ))}
      {addingKeyState && handleAdd && type === 'object' && (
        <>
          {hasKeyOptionsList ? (
            <div className="jer-select jer-select-keys">
              <select
                name="new-key-select"
                className="jer-select-inner"
                onChange={(e) => {
                  handleConfirmAdd(e.target.value)
                }}
                defaultValue=""
                autoFocus
                onKeyDown={(e: React.KeyboardEvent) => {
                  handleKeyboard(e, {
                    cancel: () => updateAddingState(false),
                  })
                }}
              >
                <option value="" disabled>
                  {addingKeyState.length > 0
                    ? translate('KEY_SELECT', nodeData)
                    : translate('NO_KEY_OPTIONS', nodeData)}
                </option>
                {addingKeyState.map((val) => (
                  <option value={val} key={val}>
                    {val}
                  </option>
                ))}
              </select>
              <span className="focus"></span>
            </div>
          ) : (
            <input
              className="jer-input-new-key"
              type="text"
              name="new-object-key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              autoFocus
              onFocus={(e) => e.target.select()}
              onKeyDown={handleKeyPress}
              style={getStyles('input', nodeData)}
            />
          )}
          <InputButtons
            onOk={() => {
              if (hasKeyOptionsList && !newKey) return
              handleConfirmAdd(newKey)
            }}
            onCancel={() => {
              updateAddingState(false)
            }}
            nodeData={nodeData}
            editConfirmRef={editConfirmRef}
            hideOk={hasKeyOptionsList}
          />
        </>
      )}
    </div>
  )
}

export const InputButtons: React.FC<{
  onOk: () => void
  onCancel: () => void
  nodeData: NodeData
  editConfirmRef: React.RefObject<HTMLDivElement | null>
  hideOk?: boolean
}> = ({ onOk, onCancel, nodeData, editConfirmRef, hideOk = false }) => {
  return (
    <div className="jer-confirm-buttons">
      {!hideOk && (
        // Pass an anonymous function to prevent passing event to onOk
        <div onClick={onOk} ref={editConfirmRef as React.RefObject<HTMLDivElement>}>
          <Icon name="ok" nodeData={nodeData} />
        </div>
      )}
      <div onClick={onCancel}>
        <Icon name="cancel" nodeData={nodeData} />
      </div>
    </div>
  )
}

const stringifyPath = (path: CollectionKey[]): string =>
  path.reduce((str: string, part) => {
    if (typeof part === 'number') return `${str}[${part}]`
    else return str === '' ? part : `${str}.${part}`
  }, '')
