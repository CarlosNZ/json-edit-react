import React from 'react'

const SourceIndicator = () => {
  // Directly check if we're using the local source
  if (import.meta.env.VITE_USE_LOCAL_SRC !== 'true') return null

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
          backgroundColor: '#ef4444',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
          padding: '4px 8px',
          borderRadius: '9999px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        LOCAL
      </div>
    </div>
  )
}

export default SourceIndicator
