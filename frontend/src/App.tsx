import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export default function App() {
  const [health, setHealth] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then((data) => setHealth(data.status))
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Test Project</h1>
      <p>Frontend: React + Vite</p>
      {health && <p>Backend: {health}</p>}
      {error && <p style={{ color: 'red' }}>API error: {error}</p>}
    </div>
  )
}
