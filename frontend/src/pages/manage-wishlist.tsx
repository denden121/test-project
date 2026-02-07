import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useForm, type UseFormRegister, type UseFormHandleSubmit } from 'react-hook-form'
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
import { useI18n } from '@/contexts/i18n-context'
import { API_URL, type WishlistManageDetailResponse, type WishlistItemResponse } from '@/lib/api'
import { removeStoredWishlist } from '@/lib/wishlist-storage'

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0
  return typeof v === 'string' ? parseFloat(v) || 0 : v
}

type ItemFormValues = {
  title: string
  link: string
  price: string
  image_url: string
}

export function ManageWishlist() {
  const { t } = useI18n()
  const { creatorSecret } = useParams<{ creatorSecret: string }>()
  const navigate = useNavigate()
  const [wishlist, setWishlist] = useState<WishlistManageDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<ItemFormValues>({
    defaultValues: { title: '', link: '', price: '', image_url: '' },
  })

  useEffect(() => {
    if (!creatorSecret) return
    axios
      .get<WishlistManageDetailResponse>(`${API_URL}/wishlists/m/${creatorSecret}`)
      .then((r) => setWishlist(r.data))
      .catch((e) => setError(e.response?.data?.detail ?? e.message))
      .finally(() => setLoading(false))
  }, [creatorSecret])

  const shareUrl = creatorSecret
    ? `${window.location.origin}/wishlists/s/${wishlist?.slug ?? ''}`
    : ''

  const copyLink = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const onAddItem = async (data: ItemFormValues) => {
    if (!creatorSecret) return
    setError(null)
    try {
      const { data: item } = await axios.post<WishlistItemResponse>(
        `${API_URL}/wishlists/m/${creatorSecret}/items`,
        {
          title: data.title,
          link: data.link || null,
          price: data.price ? Number(data.price) : null,
          image_url: data.image_url || null,
        }
      )
      setWishlist((w) =>
        w ? { ...w, items: [...w.items, item] } : null
      )
      reset()
    } catch (e: unknown) {
      setError(axios.isAxiosError(e) ? String(e.response?.data?.detail ?? e.message) : t('common.error'))
    }
  }

  const onUpdateItem = async (itemId: number, data: ItemFormValues) => {
    if (!creatorSecret) return
    setError(null)
    try {
      const { data: updated } = await axios.patch<WishlistItemResponse>(
        `${API_URL}/wishlists/m/${creatorSecret}/items/${itemId}`,
        {
          title: data.title,
          link: data.link || null,
          price: data.price ? Number(data.price) : null,
          image_url: data.image_url || null,
        }
      )
      setWishlist((w) =>
        w ? { ...w, items: w.items.map((i) => (i.id === itemId ? updated : i)) } : null
      )
      setEditingId(null)
    } catch (e: unknown) {
      setError(axios.isAxiosError(e) ? String(e.response?.data?.detail ?? e.message) : t('common.error'))
    }
  }

  const onDeleteItem = async (itemId: number) => {
    if (!creatorSecret || !confirm(t('wishlist.deleteItemConfirm'))) return
    try {
      await axios.delete(`${API_URL}/wishlists/m/${creatorSecret}/items/${itemId}`)
      setWishlist((w) => (w ? { ...w, items: w.items.filter((i) => i.id !== itemId) } : null))
    } catch (e: unknown) {
      setError(axios.isAxiosError(e) ? String(e.response?.data?.detail ?? e.message) : t('common.error'))
    }
  }

  const onDeleteList = async () => {
    if (!creatorSecret || !confirm(t('wishlist.deleteConfirm'))) return
    try {
      await axios.delete(`${API_URL}/wishlists/m/${creatorSecret}`)
      removeStoredWishlist(creatorSecret)
      navigate('/')
    } catch (e: unknown) {
      setError(axios.isAxiosError(e) ? String(e.response?.data?.detail ?? e.message) : t('common.error'))
    }
  }

  if (loading) return <p className="text-muted-foreground">{t('common.loading')}</p>
  if (error && !wishlist) return <p className="text-destructive">{t('common.error')}: {error}</p>
  if (!wishlist) return <p className="text-muted-foreground">{t('common.notFound')}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{wishlist.title}</h1>
        <Button variant="outline" size="sm" asChild>
          <Link to="/">{t('common.back')}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('wishlist.shareLink')}</CardTitle>
          <CardDescription>{t('wishlist.copyLink')}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input readOnly value={shareUrl} className="font-mono text-sm" />
          <Button type="button" variant="secondary" onClick={copyLink}>
            {linkCopied ? t('wishlist.copied') : t('wishlist.copyLink')}
          </Button>
        </CardContent>
      </Card>

      {editingId === null && (
        <Card>
          <CardHeader>
            <CardTitle>{t('wishlist.addItem')}</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit(onAddItem)}>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('wishlist.itemTitle')}</Label>
              <Input {...register('title', { required: true })} placeholder={t('wishlist.itemTitle')} />
            </div>
            <div className="space-y-2">
              <Label>{t('wishlist.itemLink')}</Label>
              <Input {...register('link')} type="url" placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>{t('wishlist.itemPrice')}</Label>
              <Input {...register('price')} type="number" step="0.01" placeholder="0" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('wishlist.itemImage')}</Label>
              <Input {...register('image_url')} type="url" placeholder="https://..." />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>{t('wishlist.addItem')}</Button>
          </CardFooter>
        </form>
      </Card>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-medium">{t('wishlist.manage')}</h2>
        <ul className="space-y-2">
          {wishlist.items.map((item) => (
            <li key={item.id}>
              {editingId === item.id ? (
                <ItemEditForm
                  register={register}
                  onSave={(data) => onUpdateItem(item.id, data)}
                  onCancel={() => setEditingId(null)}
                  handleSubmit={handleSubmit}
                  t={t}
                />
              ) : (
                <ItemRow
                  item={item}
                  onEdit={() => {
                    setEditingId(item.id)
                    setValue('title', item.title)
                    setValue('link', item.link ?? '')
                    setValue('price', item.price != null ? String(item.price) : '')
                    setValue('image_url', item.image_url ?? '')
                  }}
                  onDelete={() => onDeleteItem(item.id)}
                  t={t}
                />
              )}
            </li>
          ))}
        </ul>
        {wishlist.items.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('wishlist.noLists')}</p>
        )}
      </div>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">{t('wishlist.deleteList')}</CardTitle>
          <CardDescription>{t('wishlist.deleteConfirm')}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="destructive" onClick={onDeleteList}>
            {t('common.delete')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

function ItemRow({
  item,
  onEdit,
  onDelete,
  t,
}: {
  item: WishlistItemResponse
  onEdit: () => void
  onDelete: () => void
  t: (k: string) => string
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {item.image_url && (
            <img
              src={item.image_url}
              alt=""
              className="h-12 w-12 shrink-0 rounded object-cover"
            />
          )}
          <div className="min-w-0">
            <p className="font-medium">{item.title}</p>
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline truncate block"
              >
                {item.link}
              </a>
            )}
            {item.price != null && (
              <p className="text-sm text-muted-foreground">{item.price}</p>
            )}
            {item.price != null && Number(item.price) > 0 && (
              <div className="mt-1 space-y-0.5">
                <p className="text-xs text-muted-foreground">
                  {t('wishlist.collected')} {toNum(item.total_contributed)} {t('wishlist.of')} {toNum(item.price)}
                </p>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.min(100, (toNum(item.total_contributed) / toNum(item.price)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {item.is_reserved && (
              <span className="text-xs text-muted-foreground">{t('wishlist.reserved')}</span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            {t('wishlist.editItem')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
            {t('wishlist.deleteItem')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ItemEditForm({
  register,
  onSave,
  onCancel,
  handleSubmit,
  t,
}: {
  register: UseFormRegister<ItemFormValues>
  onSave: (data: ItemFormValues) => void
  onCancel: () => void
  handleSubmit: UseFormHandleSubmit<ItemFormValues>
  t: (k: string) => string
}) {
  return (
    <Card>
      <form onSubmit={handleSubmit(onSave)}>
        <CardContent className="grid gap-2 py-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>{t('wishlist.itemTitle')}</Label>
            <Input {...register('title', { required: true })} />
          </div>
          <div className="space-y-1">
            <Label>{t('wishlist.itemLink')}</Label>
            <Input {...register('link')} type="url" />
          </div>
          <div className="space-y-1">
            <Label>{t('wishlist.itemPrice')}</Label>
            <Input {...register('price')} type="number" step="0.01" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>{t('wishlist.itemImage')}</Label>
            <Input {...register('image_url')} type="url" />
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button type="submit">{t('common.save')}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
