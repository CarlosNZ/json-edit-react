import React from 'react'
import { HiOutlineClipboardCopy } from 'react-icons/hi'
import { BiEdit, BiPlusCircle } from 'react-icons/bi'
import { MdDeleteForever } from 'react-icons/md'
import { FiCheckCircle } from 'react-icons/fi'
import { TiCancel } from 'react-icons/ti'
import { FaChevronDown } from 'react-icons/fa'
import { useTheme } from './theme'
import { type NodeData } from './types'

interface IconProps {
  name: string
  nodeData: NodeData
  rotate?: boolean
}

export const Icon: React.FC<IconProps> = ({ name, nodeData, rotate }): JSX.Element => {
  const { getStyles, icons } = useTheme()

  const commonProps = { size: '1.4em', className: 'jer-icon' }

  switch (name) {
    case 'add':
      return icons?.add ?? <BiPlusCircle {...commonProps} style={getStyles('iconAdd', nodeData)} />
    case 'edit':
      return icons?.edit ?? <BiEdit {...commonProps} style={getStyles('iconEdit', nodeData)} />
    case 'delete':
      return (
        icons?.delete ?? (
          <MdDeleteForever
            {...commonProps}
            style={getStyles('iconDelete', nodeData)}
            size="1.5em"
          />
        )
      )
    case 'copy':
      return (
        icons?.copy ?? (
          <HiOutlineClipboardCopy {...commonProps} style={getStyles('iconCopy', nodeData)} />
        )
      )
    case 'ok':
      return (
        icons?.ok ?? (
          <FiCheckCircle
            {...commonProps}
            style={{ fontSize: '90%', ...getStyles('iconOk', nodeData) }}
          />
        )
      )
    case 'cancel':
      return (
        icons?.cancel ?? (
          <TiCancel
            {...commonProps}
            style={{ fontSize: '130%', ...getStyles('iconCancel', nodeData) }}
          />
        )
      )
    case 'chevron':
      return (
        icons?.chevron ?? (
          <FaChevronDown
            className={`jer-accordion-icon${rotate ? ' jer-rotate-90' : ''}`}
            style={getStyles('iconCollection', nodeData)}
          />
        )
      )
    default:
      return <></>
  }
}
