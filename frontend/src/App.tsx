import { useEffect, useState } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { useI18n } from '@/contexts/i18n-context'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function formatTimestamp(ts: string | undefined): string {
  if (ts == null || ts === '') return ''
  const date = new Date(ts)
  return Number.isNaN(date.getTime()) ? ts : date.toLocaleString()
}

type TestResponse = {
  message: string
  timestamp: string
  source: string
}

export default function App() {
  const { t } = useI18n()
  const [health, setHealth] = useState<string | null>(null)
  const [testData, setTestData] = useState<TestResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchApi = () => {
    setError(null)
    Promise.all([
      axios.get<{ status: string }>(`${API_URL}/health`),
      axios.get<TestResponse>(`${API_URL}/test`),
    ])
      .then(([healthRes, testRes]) => {
        setHealth(healthRes.data.status)
        setTestData(testRes.data)
      })
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    fetchApi()
  }, [])

  const testParts = testData
    ? [testData.source, formatTimestamp(testData.timestamp)].filter(Boolean)
    : []

  return (
    <div className="min-h-svh bg-background p-6 font-sans text-foreground">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex justify-end gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t('app.title')}</CardTitle>
            <CardDescription>{t('app.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {health && (
              <p className="text-sm">
                {t('app.backendHealth')} <span className="font-medium">{health}</span>
              </p>
            )}
            {testData && (
              <p className="text-sm">
                {t('app.testEndpoint')} <strong>{testData.message ?? '—'}</strong>
                {testParts.length > 0 && ` (${testParts.join(', ')})`}
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive">{t('app.apiError')} {error}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={fetchApi}>{t('app.refresh')}</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
