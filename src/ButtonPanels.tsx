import React, { useLayoutEffect, useState } from 'react'
import { extract } from './utils/extract'
import { Icon } from './Icons'
import { useTheme, useEditingStore, useEditingSelector } from './contexts'
import { type TranslateFunction } from './localisation'
import {
  type CollectionDataType,
  type CopyType,
  type NodeData,
  type CustomButtonDefinition,
  type KeyboardControlsFull,
  type OnCopyFunction,
  JsonData,
} from './types'
import { getModifier } from './utils/keyboard'
import { pathsEqual, stringifyPath } from './utils/pathTools'

interface EditButtonProps {
  startEdit?: () => void
  handleDelete?: () => void
  allowClipboard: boolean
  onCopy?: OnCopyFunction
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
  showIconTooltips: boolean
}

export const EditButtons: React.FC<EditButtonProps> = ({
  startEdit,
  handleDelete,
  handleAdd,
  allowClipboard,
  onCopy,
  type,
  customButtons,
  nodeData,
  translate,
  keyboardControls,
  handleKeyboard,
  editConfirmRef,
  getNewKeyOptions,
  jsonStringify,
  showIconTooltips,
}) => {
  const { getStyles } = useTheme()
  // Actions only (no subscription beyond the `isAddingHere` selector below).
  // Aliased — `startEdit` is also an EditButtons prop (the value-edit icon).
  const { open, cancel } = useEditingStore()
  const NEW_KEY_PROMPT = translate('KEY_NEW', nodeData)
  const [newKey, setNewKey] = useState(NEW_KEY_PROMPT)

  // Holds the new-key options list (or `true` for a free-text add). Open/close is
  // driven by the store (`mode: 'add'`) so the start/cancel events and the
  // one-session-at-a-time invariant are shared with edit/rename; this just
  // carries the options *content* (which the primitive-only store selector
  // can't), synced by the effect below.
  const [addingKeyState, setAddingKeyState] = useState<string[] | boolean>(false)

  const { path, value: data } = nodeData

  // Is an add session open on THIS collection? The session lives in the editing
  // store (`mode: 'add'`, `path` = this collection), so the start/cancel events
  // and the one-session-at-a-time invariant are shared with edit/rename.
  const isAddingHere = useEditingSelector((s) => {
    const e = s.active
    return e !== null && e.op === 'add' && pathsEqual(e.path, path)
  })

  const hasKeyOptionsList = Array.isArray(addingKeyState)

  // Sync the local options/content state to the store session. On open compute
  // the available keys; on close reset. `startAdd` / `cancelAdd` are fired by the
  // store; `commitAdd` by CollectionNode's commit.
  useLayoutEffect(() => {
    if (!isAddingHere) {
      setAddingKeyState(false)
      setNewKey(NEW_KEY_PROMPT)
      return
    }
    // Don't offer keys that already exist. Reads the node's OWN subtree (by
    // `path`), kept consistent by structural sharing even if `fullData` is stale.
    const existingKeys = Object.keys(extract(nodeData.fullData, path) as object)
    const options = getNewKeyOptions
      ? getNewKeyOptions(nodeData)?.filter((key) => !existingKeys.includes(key))
      : null
    if (options) setNewKey('')
    setAddingKeyState(options ?? true)
    // Fire only on the open/close transition; the reads inside are intentionally
    // captured at that moment, not re-subscribed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddingHere])

  // Open an add session on this object collection (shows the new-key input).
  const openAdd = () => open(path, { op: 'add' })

  // Commit the open add session (OK button / Enter). Delegates to `handleAdd`,
  // which fires the `commitAdd` / error observer.
  const commitAdd = () => {
    if (!handleAdd) return
    // Options-list with nothing chosen yet — silent no-op.
    if (hasKeyOptionsList && !newKey) return
    handleAdd(type === 'array' ? '' : newKey)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    handleKeyboard(e, {
      stringConfirm: () => commitAdd(),
      cancel: () => cancel(),
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
          error: { code: 'CLIPBOARD_ERROR', message: "Can't access clipboard API" },
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
            error: success
              ? undefined
              : { code: 'CLIPBOARD_ERROR', message: errorMessage ?? 'Copy failed' },
          })
        })
    }
  }

  return (
    <div
      className="jer-edit-buttons"
      style={{ opacity: isAddingHere ? 1 : undefined }}
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
          onClick={handleDelete}
          title={showIconTooltips ? translate('TOOLTIP_DELETE', nodeData) : ''}
        >
          <Icon name="delete" nodeData={nodeData} />
        </div>
      )}
      {handleAdd && (
        <div
          onClick={() => {
            // Objects open a key-entry session; arrays add a default value
            // immediately (no key to fill — a one-shot, as before).
            if (type === 'object') openAdd()
            else handleAdd('')
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
      {isAddingHere && handleAdd && type === 'object' && (
        <>
          {hasKeyOptionsList ? (
            <div className="jer-select jer-select-keys">
              <select
                name="new-key-select"
                className="jer-select-inner"
                onChange={(e) => {
                  // The chosen option IS the key — commit it directly.
                  handleAdd(e.target.value)
                }}
                defaultValue=""
                autoFocus
                onKeyDown={(e: React.KeyboardEvent) => {
                  handleKeyboard(e, { cancel: () => cancel() })
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
            onOk={() => commitAdd()}
            onCancel={() => cancel()}
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
