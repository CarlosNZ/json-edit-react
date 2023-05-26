import React from 'react'
import { HiOutlineClipboardCopy } from 'react-icons/hi'
import { BiEdit } from 'react-icons/bi'
import { MdDeleteForever } from 'react-icons/md'
import { GrAddCircle } from 'react-icons/gr'
import { FiCheckCircle } from 'react-icons/fi'
import { TiCancel } from 'react-icons/ti'
import { FaChevronDown } from 'react-icons/fa'
import { useTheme } from './theme'

interface IconProps {
  name: string
}

export const Icon: React.FC<IconProps> = ({ name }): JSX.Element => {
  const { styles } = useTheme()

  switch (name) {
    case 'add':
      return <GrAddCircle className="jer-icon" style={styles.iconAdd} />
    case 'edit':
      return <BiEdit className="jer-icon" style={styles.iconEdit} />
    case 'delete':
      return <MdDeleteForever className="jer-icon" style={styles.iconDelete} />
    case 'copy':
      return <HiOutlineClipboardCopy className="jer-icon" style={styles.iconCopy} />
    case 'ok':
      return <FiCheckCircle className="jer-icon" style={styles.iconOk} />
    case 'cancel':
      return <TiCancel className="jer-icon" style={styles.iconCancel} />
    case 'chevron':
      return <FaChevronDown className="jer-icon" style={styles.iconCollection} />
    default:
      return <></>
  }
}
