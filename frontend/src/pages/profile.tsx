import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { useI18n } from '@/contexts/i18n-context'
import { useUpdateMeMutation } from '@/store/api/authApi'
import { useAppDispatch } from '@/store/hooks'
import { setUser } from '@/store/slices/authSlice'

function getInitial(email: string): string {
  const part = email.split('@')[0] ?? ''
  return (part[0] ?? '?').toUpperCase()
}

export function Profile() {
  const { t } = useI18n()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [updateMe, { isLoading: isUpdating }] = useUpdateMeMutation()
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    setAvatarUrl(user?.avatar_url ?? '')
  }, [user?.avatar_url])

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const handleSaveAvatar = async () => {
    if (!user) return
    setSaveMessage(null)
    try {
      const updated = await updateMe({ avatar_url: avatarUrl.trim() || null }).unwrap()
      dispatch(setUser(updated))
      setSaveMessage(t('profile.avatarSaved'))
    } catch {
      setSaveMessage(t('common.error'))
    }
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
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-2xl font-medium text-primary-foreground ring-2 ring-border">
              {(user?.avatar_url || avatarUrl.trim()) ? (
                <img
                  src={user?.avatar_url || avatarUrl.trim()}
                  alt=""
                  className="size-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{user?.email ? getInitial(user.email) : '?'}</span>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="profile-avatar">{t('profile.photoUrl')}</Label>
              <Input
                id="profile-avatar"
                type="url"
                placeholder="https://..."
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleSaveAvatar}
                disabled={isUpdating}
              >
                {isUpdating ? t('common.loading') : t('profile.savePhoto')}
              </Button>
              {saveMessage && (
                <p className="text-sm text-muted-foreground">{saveMessage}</p>
              )}
            </div>
          </div>
          <div className="space-y-2 border-t border-border pt-4">
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
