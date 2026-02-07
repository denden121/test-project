import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { LoginForm } from '@/components/login-form'
import { RegisterForm } from '@/components/register-form'
import { useI18n } from '@/contexts/i18n-context'

export function LoginPage() {
  const { t } = useI18n()
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login')

  return (
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
  )
}
