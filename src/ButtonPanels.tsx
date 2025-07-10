import React, { useState } from 'react'
import extract from 'object-property-extractor'
import { Icon } from './Icons'
import { useTheme } from './contexts'
import { type TranslateFunction } from './localisation'
import {
  type CollectionKey,
  type CollectionDataType,
  type CopyFunction,
  type CopyType,
  type NodeData,
  type CustomButtonDefinition,
  type KeyboardControlsFull,
  JsonData,
  OnEditEventFunction,
} from './types'
import { getModifier } from './helpers'

interface EditButtonProps {
  startEdit?: () => void
  handleDelete?: () => void
  enableClipboard: boolean | CopyFunction
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
  enableClipboard,
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

  const { key, path, value: data } = nodeData

  const hasKeyOptionsList = Array.isArray(addingKeyState)

  const updateAddingState = (active: boolean) => {
    // Add 'null' to the path to indicate that the actual path of where the new
    // key will go is not yet known.
    if (onEditEvent) onEditEvent([...path, null], active)

    if (!active) {
      setAddingKeyState(false)
      return
    }

    // Don't show keys that already exist in the object
    const existingKeys = Object.keys(extract(nodeData.fullData, path) as object)

    const options = getNewKeyOptions
      ? getNewKeyOptions(nodeData)?.filter((key) => !existingKeys.includes(key))
      : null
    if (options) setNewKey('')
    setAddingKeyState(options ?? true)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    handleKeyboard(e, {
      stringConfirm: () => {
        if (handleAdd) {
          updateAddingState(false)
          handleAdd(newKey)
          setNewKey(NEW_KEY_PROMPT)
        }
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
    if (enableClipboard) {
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
        if (typeof enableClipboard === 'function')
          enableClipboard({
            success: false,
            value,
            stringValue,
            path,
            key,
            type: copyType,
            errorMessage: "Can't access clipboard API",
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
          if (typeof enableClipboard === 'function') {
            enableClipboard({
              success,
              errorMessage,
              value,
              stringValue,
              path,
              key,
              type: copyType,
            })
          }
        })
    }
  }

  return (
    <div
      className="jer-edit-buttons"
      style={{ opacity: addingKeyState ? 1 : undefined }}
      onClick={(e) => e.stopPropagation()}
    >
      {enableClipboard && (
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
            if (type === 'object') updateAddingState(true)
            // For arrays, we don't need to add a key
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
      {addingKeyState && handleAdd && type === 'object' && (
        <>
          {hasKeyOptionsList ? (
            <div className="jer-select jer-select-keys">
              <select
                name="new-key-select"
                className="jer-select-inner"
                onChange={(e) => {
                  handleAdd(e.target.value)
                  updateAddingState(false)
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

              updateAddingState(false)
              handleAdd(newKey)
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
