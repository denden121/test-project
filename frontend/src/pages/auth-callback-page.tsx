import { useEffect, useRef, useState } from 'react'
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

  useEffect(() => {
    if (processed.current) return
    const code = searchParams.get('code')
    if (!code) {
      setError(t('auth.googleError'))
      return
    }
    processed.current = true
    const redirectUri = `${window.location.origin}/auth/callback`
    loginWithGoogle(code, redirectUri)
      .then(() => {
        navigate('/', { replace: true })
      })
      .catch(() => {
        setError(t('auth.googleError'))
      })
  }, [searchParams, loginWithGoogle, navigate, t])

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
