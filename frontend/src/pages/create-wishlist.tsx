import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/contexts/i18n-context'
import { API_URL, type WishlistManageResponse } from '@/lib/api'
import { addStoredWishlist } from '@/lib/wishlist-storage'

type FormValues = { title: string }

export function CreateWishlist() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { title: '' } })

  const onSubmit = async (data: FormValues) => {
    setApiError(null)
    try {
      const { data: w } = await axios.post<WishlistManageResponse>(`${API_URL}/wishlists`, {
        title: data.title,
      })
      addStoredWishlist({
        creator_secret: w.creator_secret,
        slug: w.slug,
        title: w.title,
      })
      navigate(`/wishlists/manage/${w.creator_secret}`)
    } catch (err: unknown) {
      setApiError(axios.isAxiosError(err) ? String(err.response?.data?.detail ?? err.message) : t('common.error'))
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{t('wishlist.createNew')}</CardTitle>
          <CardDescription>{t('wishlist.listTitle')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {apiError && <p className="text-sm text-destructive">{apiError}</p>}
            <div className="space-y-2">
              <Label htmlFor="title">{t('wishlist.listTitle')}</Label>
              <Input
                id="title"
                {...register('title', { required: true })}
                placeholder={t('wishlist.listTitlePlaceholder')}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{t('auth.fieldRequired')}</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('auth.submitting') : t('wishlist.create')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
