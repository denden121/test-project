import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
import { useResetPasswordMutation } from '@/store/api/authApi'
import { useI18n } from '@/contexts/i18n-context'

type ResetFormValues = { new_password: string; password_confirm: string }

export function ResetPasswordPage() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [resetPassword, { isSuccess, isError, error }] = useResetPasswordMutation()
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    defaultValues: { new_password: '', password_confirm: '' },
  })

  const newPassword = watch('new_password')

  const onSubmit = async (data: ResetFormValues) => {
    if (!token) return
    setApiError(null)
    try {
      await resetPassword({ token, new_password: data.new_password }).unwrap()
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { detail?: string } }).data?.detail
          : undefined
      setApiError(typeof detail === 'string' ? detail : t('auth.error'))
    }
  }

  if (isSuccess) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>{t('auth.resetPasswordTitle')}</CardTitle>
            <CardDescription>{t('auth.resetPasswordSuccess')}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/login">{t('auth.tabLogin')}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>{t('auth.resetPasswordTitle')}</CardTitle>
            <CardDescription>{t('auth.resetTokenInvalid')}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link to="/forgot-password">{t('auth.forgotPasswordTitle')}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{t('auth.resetPasswordTitle')}</CardTitle>
          <CardDescription>{t('auth.resetPasswordDescription')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} autoComplete="on" noValidate>
          <CardContent className="space-y-4">
            {(apiError || (isError && error && 'data' in error)) && (
              <p className="text-sm text-destructive">
                {apiError ??
                  (error && typeof error === 'object' && 'data' in error
                    ? (error as { data?: { detail?: string } }).data?.detail
                    : t('auth.error'))}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="reset-new-password">{t('auth.newPassword')}</Label>
              <Input
                id="reset-new-password"
                type="password"
                autoComplete="new-password"
                className="w-full"
                {...register('new_password', {
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
              {errors.new_password && (
                <p className="text-sm text-destructive">
                  {errors.new_password.type === 'required'
                    ? t('auth.fieldRequired')
                    : errors.new_password.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-password-confirm">{t('auth.passwordConfirm')}</Label>
              <Input
                id="reset-password-confirm"
                type="password"
                autoComplete="new-password"
                className="w-full"
                {...register('password_confirm', {
                  required: true,
                  validate: (value) =>
                    value === newPassword || t('auth.passwordMismatch'),
                })}
              />
              {errors.password_confirm && (
                <p className="text-sm text-destructive">
                  {errors.password_confirm.type === 'required'
                    ? t('auth.fieldRequired')
                    : errors.password_confirm.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? t('auth.submitting') : t('auth.resetPasswordSubmit')}
            </Button>
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link to="/login">{t('auth.tabLogin')}</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
