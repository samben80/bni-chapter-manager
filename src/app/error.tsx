'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: 24, fontFamily: 'monospace', background: '#fff1f0', color: '#a00', minHeight: '100vh' }}>
      <h2 style={{ fontSize: 20, marginBottom: 12 }}>Erreur de rendu</h2>
      <pre style={{ background: '#ffe', padding: 12, borderRadius: 6, overflow: 'auto', fontSize: 13 }}>
        {error.message}
        {'\n\n'}
        {error.stack}
      </pre>
      <button
        onClick={reset}
        style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}
      >
        Réessayer
      </button>
    </div>
  )
}
