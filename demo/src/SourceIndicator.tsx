const SourceIndicator = () => {
  // Determine json-edit-react source from Env variable
  // Default is "published", so don't display anything additional in that case
  if (!['local', 'package'].includes(import.meta.env.VITE_JRE_SOURCE)) return null

  const backgroundColor = import.meta.env.VITE_JRE_SOURCE === 'package' ? '#ff51ff' : '#ef4444'
  const text = import.meta.env.VITE_JRE_SOURCE === 'package' ? 'BUILD' : 'LOCAL'

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '32px',
        right: '16px',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          backgroundColor,
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
          padding: '4px 8px',
          borderRadius: '9999px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        {text}
      </div>
    </div>
  )
}

export default SourceIndicator
