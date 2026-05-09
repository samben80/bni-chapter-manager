'use client'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body style={{ padding: 24, fontFamily: 'monospace', background: '#fff1f0', color: '#a00' }}>
        <h2>Erreur globale</h2>
        <pre style={{ background: '#ffe', padding: 12, borderRadius: 6, overflow: 'auto', fontSize: 13 }}>
          {error.message}
          {'\n\n'}
          {error.stack}
        </pre>
        <button onClick={reset} style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}>
          Réessayer
        </button>
      </body>
    </html>
  )
}
