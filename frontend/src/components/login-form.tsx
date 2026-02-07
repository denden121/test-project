import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { useI18n } from '@/contexts/i18n-context'

type LoginFormValues = {
  email: string
  password: string
}

export function LoginForm() {
  const { t } = useI18n()
  const { login } = useAuth()
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setApiError(null)
    try {
      await login(data.email, data.password)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err && (err as { data?: { detail?: string } }).data?.detail
          ? String((err as { data: { detail: string } }).data.detail)
          : err instanceof Error
            ? err.message
            : t('auth.error')
      setApiError(msg)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('auth.loginTitle')}</CardTitle>
        <CardDescription>{t('auth.loginDescription')}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {apiError && (
            <p className="text-sm text-destructive">{apiError}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="login-email">{t('auth.email')}</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full"
              {...register('email', {
                required: true,
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: t('auth.emailInvalid'),
                },
              })}
            />
            {errors.email && (
              <p className="text-sm text-destructive">
                {errors.email.type === 'required'
                  ? t('auth.fieldRequired')
                  : errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">{t('auth.password')}</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              className="w-full"
              {...register('password', { required: true })}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{t('auth.fieldRequired')}</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('auth.submitting') : t('auth.login')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
