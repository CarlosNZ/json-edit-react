import React from 'react'
import { HiOutlineClipboardCopy } from 'react-icons/hi'
import { BiEdit, BiPlusCircle } from 'react-icons/bi'
import { MdDeleteForever } from 'react-icons/md'
import { FiCheckCircle } from 'react-icons/fi'
import { TiCancel } from 'react-icons/ti'
import { FaChevronDown } from 'react-icons/fa'
import { useTheme } from './theme'

interface IconProps {
  name: string
  rotate?: boolean
}

export const Icon: React.FC<IconProps> = ({ name, rotate }): JSX.Element => {
  const { styles, icons } = useTheme()

  const commonProps = { size: '1.4em', className: 'jer-icon' }

  switch (name) {
    case 'add':
      return icons?.add ?? <BiPlusCircle {...commonProps} style={styles.iconAdd} />
    case 'edit':
      return icons?.edit ?? <BiEdit {...commonProps} style={styles.iconEdit} />
    case 'delete':
      return (
        icons?.delete ?? <MdDeleteForever {...commonProps} style={styles.iconDelete} size="1.5em" />
      )
    case 'copy':
      return icons?.copy ?? <HiOutlineClipboardCopy {...commonProps} style={styles.iconCopy} />
    case 'ok':
      return (
        icons?.ok ?? (
          <FiCheckCircle {...commonProps} style={{ fontSize: '90%', ...styles.iconOk }} />
        )
      )
    case 'cancel':
      return (
        icons?.cancel ?? (
          <TiCancel {...commonProps} style={{ fontSize: '130%', ...styles.iconCancel }} />
        )
      )
    case 'chevron':
      return (
        icons?.chevron ?? (
          <FaChevronDown
            className={`${rotate ? ' jer-rotate-90' : ''}`}
            style={styles.iconCollection}
          />
        )
      )
    default:
      return <></>
  }
}
