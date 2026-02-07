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
import { LoginForm } from '@/components/login-form'
import { RegisterForm } from '@/components/register-form'
import { useAuth } from '@/contexts/auth-context'
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
  const { token, user, loading, logout } = useAuth()
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login')
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
    if (token) fetchApi()
  }, [token])

  const testParts = testData
    ? [testData.source, formatTimestamp(testData.timestamp)].filter(Boolean)
    : []

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background font-sans text-foreground">
        <p className="text-muted-foreground">{t('auth.submitting')}</p>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-svh bg-background p-6 font-sans text-foreground">
        <div className="mx-auto max-w-md space-y-6">
          <div className="flex justify-end gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={authTab === 'login' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setAuthTab('login')}
            >
              {t('auth.tabLogin')}
            </Button>
            <Button
              type="button"
              variant={authTab === 'register' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setAuthTab('register')}
            >
              {t('auth.tabRegister')}
            </Button>
          </div>
          {authTab === 'login' ? <LoginForm /> : <RegisterForm />}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background p-6 font-sans text-foreground">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {user && (
            <span className="text-sm text-muted-foreground">{user.email}</span>
          )}
          <Button type="button" variant="outline" size="sm" onClick={logout}>
            {t('auth.logout')}
          </Button>
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
