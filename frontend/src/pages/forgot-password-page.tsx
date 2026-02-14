import { useState } from 'react'
import { Link } from 'react-router-dom'
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
import { useForgotPasswordMutation } from '@/store/api/authApi'
import { useI18n } from '@/contexts/i18n-context'

type ForgotFormValues = { email: string }

export function ForgotPasswordPage() {
  const { t } = useI18n()
  const [forgotPassword, { isSuccess, isError, error }] = useForgotPasswordMutation()
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormValues>({
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: ForgotFormValues) => {
    setApiError(null)
    try {
      await forgotPassword({ email: data.email }).unwrap()
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
            <CardTitle>{t('auth.forgotPasswordTitle')}</CardTitle>
            <CardDescription>{t('auth.forgotPasswordSuccess')}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">{t('auth.tabLogin')}</Link>
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
          <CardTitle>{t('auth.forgotPasswordTitle')}</CardTitle>
          <CardDescription>{t('auth.forgotPasswordDescription')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} autoComplete="on">
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
              <Label htmlFor="forgot-email">{t('auth.email')}</Label>
              <Input
                id="forgot-email"
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
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? t('auth.submitting') : t('auth.sendResetLink')}
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
