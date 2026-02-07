import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

type TestResponse = {
  message: string
  timestamp: string
  source: string
}

export default function App() {
  const [health, setHealth] = useState<string | null>(null)
  const [testData, setTestData] = useState<TestResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchApi = () => {
    setError(null)
    Promise.all([
      fetch(`${API_URL}/health`).then((r) => r.json()),
      fetch(`${API_URL}/test`).then((r) => r.json()),
    ])
      .then(([healthData, testResp]) => {
        setHealth(healthData.status)
        setTestData(testResp as TestResponse)
      })
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    fetchApi()
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Test Project</h1>
      <p>Frontend: React + Vite</p>
      {health && <p>Backend health: {health}</p>}
      {testData && (
        <p>
          Тестовая ручка: <strong>{testData.message}</strong> ({testData.source},{' '}
          {new Date(testData.timestamp).toLocaleString()})
        </p>
      )}
      {error && <p style={{ color: 'red' }}>API error: {error}</p>}
      <button type="button" onClick={fetchApi}>
        Обновить
      </button>
    </div>
  )
}
