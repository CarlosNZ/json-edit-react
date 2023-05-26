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
  const { styles } = useTheme()

  const commonProps = { size: '1.4em', className: 'jer-icon' }

  switch (name) {
    case 'add':
      return <BiPlusCircle {...commonProps} style={styles.iconAdd} />
    case 'edit':
      return <BiEdit {...commonProps} style={styles.iconEdit} />
    case 'delete':
      return <MdDeleteForever {...commonProps} style={styles.iconDelete} size="1.5em" />
    case 'copy':
      return <HiOutlineClipboardCopy {...commonProps} style={styles.iconCopy} />
    case 'ok':
      return <FiCheckCircle {...commonProps} style={styles.iconOk} />
    case 'cancel':
      return <TiCancel {...commonProps} style={styles.iconCancel} size="2em" />
    case 'chevron':
      return (
        <FaChevronDown
          className={`${rotate ? ' jer-rotate-90' : ''}`}
          style={styles.iconCollection}
        />
      )
    default:
      return <></>
  }
}
