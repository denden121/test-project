import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useI18n } from '@/contexts/i18n-context'

export function Profile() {
  const { t } = useI18n()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">{t('profile.title')}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.account')}</CardTitle>
          <CardDescription>{t('profile.accountDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('auth.email')}</p>
            <p className="text-foreground">{user?.email ?? '—'}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto">
            {t('auth.logout')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
