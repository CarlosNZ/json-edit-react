// Non-default VITE_JRE_SOURCE modes get a coloured badge so it's obvious which
// version of json-edit-react the demo is consuming. The `npm` (default /
// deployed) mode renders nothing — what real users see has no badge.
//
// Shared: the custom-component-library app also imports this file directly via
// a relative path (`../../demo/src/SourceIndicator`), wrapped in React.lazy so
// TypeScript doesn't need it inside CCL's tsconfig `include`. The two apps are
// otherwise independent (see CLAUDE.md), but a one-file cross-import is the
// pragmatic tradeoff vs. duplicating the badge. If you change this component's
// export shape, expect the demo's typecheck to catch issues; if you rename or
// move this file, also update custom-component-library/src/App.tsx.
const badges: Record<string, { label: string; backgroundColor: string }> = {
  local: { label: 'LOCAL', backgroundColor: '#ef4444' },
  build: { label: 'BUILD', backgroundColor: '#ff51ff' },
  pack: { label: 'PACK', backgroundColor: '#f59e0b' },
}

const SourceIndicator = () => {
  const source = import.meta.env.VITE_JRE_SOURCE
  const badge = badges[source]
  if (!badge) return null

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
          backgroundColor: badge.backgroundColor,
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
          padding: '4px 8px',
          borderRadius: '9999px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        {badge.label}
      </div>
    </div>
  )
}

export default SourceIndicator
