import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useI18n } from '@/contexts/i18n-context'

export function AuthCallbackPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { loginWithGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const processed = useRef(false)

  const setErrorFromResponse = useCallback((err: unknown) => {
    const detail =
      err && typeof err === 'object' && err !== null && 'data' in err
        ? (err as { data?: { detail?: string } }).data?.detail
        : undefined
    setError(typeof detail === 'string' ? detail : t('auth.googleError'))
  }, [t])

  useEffect(() => {
    if (processed.current) return
    const code = searchParams.get('code')
    if (!code) {
      if (!processed.current) setError(t('auth.googleError'))
      return
    }
    processed.current = true
    // Убираем code из URL сразу, чтобы при повторном рендере (Strict Mode) или обновлении страницы не отправлять код дважды
    window.history.replaceState({}, '', window.location.pathname)
    const redirectUri = `${window.location.origin}/auth/callback`
    loginWithGoogle(code, redirectUri)
      .then(() => {
        navigate('/', { replace: true })
      })
      .catch(setErrorFromResponse)
  }, [searchParams, loginWithGoogle, navigate, t, setErrorFromResponse])

  if (error) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <p className="text-destructive">{error}</p>
        <a href="/login" className="text-primary underline">
          {t('auth.login')}
        </a>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md text-center text-muted-foreground">
      {t('common.loading')}
    </div>
  )
}
