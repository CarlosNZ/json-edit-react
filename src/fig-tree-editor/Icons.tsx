interface IconProps {
  name: string
  border?: boolean
  color?: string
  size?: string
  rotate?: boolean
}

export const Icon: React.FC<IconProps> = ({
  name,
  border = false,
  size = '1.5em',
  rotate = false,
}): JSX.Element => {
  const borderStyle = { border: border ? '1px solid black' : undefined }
  switch (name) {
    case 'chevron':
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`fg-icon-chevron${rotate ? ' fg-rotate-90' : ''}`}
          style={borderStyle}
        >
          <path d="M12 13.586 6.707 8.293a1 1 0 0 0-1.414 1.414l6 6a1 1 0 0 0 1.414 0l6-6a1 1 0 1 0-1.414-1.414L12 13.586z" />
        </svg>
      )
    case 'edit':
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className="fg-icon-edit"
          style={borderStyle}
        >
          <path
            d="M12 3.99997H6C4.89543 3.99997 4 4.8954 4 5.99997V18C4 19.1045 4.89543 20 6 20H18C19.1046 20 20 19.1045 20 18V12M18.4142 8.41417L19.5 7.32842C20.281 6.54737 20.281 5.28104 19.5 4.5C18.7189 3.71895 17.4526 3.71895 16.6715 4.50001L15.5858 5.58575M18.4142 8.41417L12.3779 14.4505C12.0987 14.7297 11.7431 14.9201 11.356 14.9975L8.41422 15.5858L9.00257 12.6441C9.08001 12.2569 9.27032 11.9013 9.54951 11.6221L15.5858 5.58575M18.4142 8.41417L15.5858 5.58575"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'delete':
      return (
        <svg
          viewBox="-1.7 0 20.4 20.4"
          width={size}
          height={size}
          className="fg-icon-delete"
          style={borderStyle}
        >
          <path d="M16.417 10.283A7.917 7.917 0 1 1 8.5 2.366a7.916 7.916 0 0 1 7.917 7.917zm-6.804.01 3.032-3.033a.792.792 0 0 0-1.12-1.12L8.494 9.173 5.46 6.14a.792.792 0 0 0-1.12 1.12l3.034 3.033-3.033 3.033a.792.792 0 0 0 1.12 1.119l3.032-3.033 3.033 3.033a.792.792 0 0 0 1.12-1.12z" />
        </svg>
      )
    case 'add':
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className="fg-icon-add"
          style={borderStyle}
        >
          <path
            d="M8 12H12M12 12H16M12 12V16M12 12V8M12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'copy':
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className="fg-icon-copy"
          style={borderStyle}
        >
          <path
            fillRule="evenodd"
            d="M3.25 2.5H4v.25C4 3.44 4.56 4 5.25 4h5.5C11.44 4 12 3.44 12 2.75V2.5h.75a.75.75 0 01.75.75v3a.75.75 0 001.5 0v-3A2.25 2.25 0 0012.75 1h-.775c-.116-.57-.62-1-1.225-1h-5.5c-.605 0-1.11.43-1.225 1H3.25A2.25 2.25 0 001 3.25v10.5A2.25 2.25 0 003.25 16h9.5A2.25 2.25 0 0015 13.75v-1a.75.75 0 00-1.5 0v1a.75.75 0 01-.75.75h-9.5a.75.75 0 01-.75-.75V3.25a.75.75 0 01.75-.75zm2.25-1v1h5v-1h-5z"
            clipRule="evenodd"
          />
          <path d="M4.75 5.5a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3zM4 12.25a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zM4.75 8.5a.75.75 0 000 1.5h2a.75.75 0 000-1.5h-2zM16 9.25a.75.75 0 01-.75.75h-4.19l1.22 1.22a.75.75 0 11-1.06 1.06l-2.5-2.5a.752.752 0 010-1.06l2.5-2.5a.75.75 0 111.06 1.06L11.06 8.5h4.19a.75.75 0 01.75.75z" />
        </svg>
      )
    case 'ok':
      return (
        <svg
          viewBox="0 0 20 20"
          width={size}
          height={size}
          className="fg-icon-ok"
          style={borderStyle}
        >
          <path
            fillRule="evenodd"
            d="M3 10a7 7 0 019.307-6.611 1 1 0 00.658-1.889 9 9 0 105.98 7.501 1 1 0 00-1.988.22A7 7 0 113 10zm14.75-5.338a1 1 0 00-1.5-1.324l-6.435 7.28-3.183-2.593a1 1 0 00-1.264 1.55l3.929 3.2a1 1 0 001.38-.113l7.072-8z"
          />
        </svg>
      )
    case 'cancel':
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className="fg-icon-cancel"
          style={borderStyle}
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM16.1716 14.7574C16.6951 13.967 17 13.0191 17 12C17 9.23858 14.7614 7 12 7C10.9809 7 10.033 7.30488 9.24261 7.8284L16.1716 14.7574ZM7.8284 9.24261L14.7574 16.1716C13.967 16.6951 13.0191 17 12 17C9.23858 17 7 14.7614 7 12C7 10.9809 7.30488 10.033 7.8284 9.24261ZM12 5C8.13401 5 5 8.13401 5 12C5 15.866 8.13401 19 12 19C15.866 19 19 15.866 19 12C19 8.13401 15.866 5 12 5Z"
          />
        </svg>
      )
    default:
      return <svg></svg>
  }
}
