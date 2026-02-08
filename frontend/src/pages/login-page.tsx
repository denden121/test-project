import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LoginForm } from '@/components/login-form'
import { RegisterForm } from '@/components/register-form'
import { useI18n } from '@/contexts/i18n-context'
import { getGoogleAuthUrl, isGoogleAuthEnabled } from '@/lib/google-auth'

export function LoginPage() {
  const { t } = useI18n()
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login')

  const handleGoogleLogin = () => {
    const redirectUri = `${window.location.origin}/auth/callback`
    window.location.href = getGoogleAuthUrl(redirectUri)
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      {isGoogleAuthEnabled() && (
        <>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
          >
            {t('auth.loginWithGoogle')}
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase text-muted-foreground">
              <span className="bg-background px-2">{t('auth.orEmail')}</span>
            </div>
          </div>
        </>
      )}
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
  )
}
