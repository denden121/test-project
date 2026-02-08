import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

type RegisterFormValues = {
  email: string
  password: string
  passwordConfirm: string
}

export function RegisterForm() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { register: registerUser } = useAuth()
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    defaultValues: { email: '', password: '', passwordConfirm: '' },
  })

  const password = watch('password')

  const onSubmit = async (data: RegisterFormValues) => {
    setApiError(null)
    try {
      await registerUser(data.email, data.password)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { detail?: string | Array<{ msg?: string }> } }).data?.detail
          : undefined
      const msg = Array.isArray(detail)
        ? detail[0]?.msg ?? t('auth.error')
        : typeof detail === 'string'
          ? detail
          : err instanceof Error
            ? err.message
            : t('auth.error')
      setApiError(msg)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('auth.registerTitle')}</CardTitle>
        <CardDescription>{t('auth.registerDescription')}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} autoComplete="on" noValidate>
        <CardContent className="space-y-4">
          {apiError && (
            <p className="text-sm text-destructive">{apiError}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="register-email">{t('auth.email')}</Label>
            <Input
              id="register-email"
              type="email"
              inputMode="email"
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
            <Label htmlFor="register-password">{t('auth.password')}</Label>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              className="w-full"
              {...register('password', {
                required: true,
                minLength: {
                  value: 8,
                  message: t('auth.passwordTooShort'),
                },
                validate: (value) => {
                  if (!/[a-zA-Z]/.test(value)) return t('auth.passwordNeedsLetter')
                  if (!/\d/.test(value)) return t('auth.passwordNeedsDigit')
                  return true
                },
              })}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.type === 'required'
                  ? t('auth.fieldRequired')
                  : errors.password.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-password-confirm">{t('auth.passwordConfirm')}</Label>
            <Input
              id="register-password-confirm"
              type="password"
              autoComplete="new-password"
              className="w-full"
              {...register('passwordConfirm', {
                required: true,
                minLength: {
                  value: 8,
                  message: t('auth.passwordTooShort'),
                },
                validate: (value) =>
                  value === password || t('auth.passwordMismatch'),
              })}
            />
            {errors.passwordConfirm && (
              <p className="text-sm text-destructive">
                {errors.passwordConfirm.type === 'required'
                  ? t('auth.fieldRequired')
                  : errors.passwordConfirm.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('auth.submitting') : t('auth.register')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
