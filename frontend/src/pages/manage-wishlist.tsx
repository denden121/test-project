import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Plus } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/contexts/i18n-context'
import { API_URL, type FetchProductResponse, type WishlistManageDetailResponse, type WishlistItemResponse, type WishlistManageResponse } from '@/lib/api'
import { removeStoredWishlist, updateStoredWishlistTitle } from '@/lib/wishlist-storage'

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0
  return typeof v === 'string' ? parseFloat(v) || 0 : v
}

type ItemFormValues = {
  title: string
  link: string
  price: string
  min_contribution: string
  image_url: string
}

const POPULAR_CURRENCIES = ['RUB', 'USD', 'EUR', 'GBP', 'CNY'] as const

type ListFormValues = {
  title: string
  occasion: string
  event_date: string
  currency: string
}

export function ManageWishlist() {
  const { t } = useI18n()
  const { creatorSecret } = useParams<{ creatorSecret: string }>()
  const navigate = useNavigate()
  const [wishlist, setWishlist] = useState<WishlistManageDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WishlistItemResponse | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator

  const { register, handleSubmit, reset, setValue, getValues, watch, formState: { isSubmitting } } = useForm<ItemFormValues>({
    defaultValues: { title: '', link: '', price: '', min_contribution: '', image_url: '' },
  })
  const [fetchProductLoading, setFetchProductLoading] = useState(false)
  const [fetchProductError, setFetchProductError] = useState<string | null>(null)
  const linkValue = watch('link')

  const listForm = useForm<ListFormValues>({
    defaultValues: { title: '', occasion: '', event_date: '', currency: 'RUB' },
  })

  useEffect(() => {
    if (!creatorSecret) return
    axios
      .get<WishlistManageDetailResponse>(`${API_URL}/wishlists/m/${creatorSecret}`)
      .then((r) => setWishlist(r.data))
      .catch((e) => setError(e.response?.data?.detail ?? e.message))
      .finally(() => setLoading(false))
  }, [creatorSecret])

  useEffect(() => {
    if (wishlist) {
      listForm.reset({
        title: wishlist.title,
        occasion: wishlist.occasion ?? '',
        event_date: wishlist.event_date ?? '',
        currency: wishlist.currency ?? 'RUB',
      })
    }
  }, [wishlist])

  const onSaveList = async (data: ListFormValues) => {
    if (!creatorSecret) return
    setError(null)
    try {
      const { data: updated } = await axios.patch<WishlistManageResponse>(
        `${API_URL}/wishlists/m/${creatorSecret}`,
        {
          title: data.title,
          occasion: data.occasion || null,
          event_date: data.event_date || null,
          currency: data.currency || 'RUB',
        }
      )
      setWishlist((w) => (w ? { ...w, ...updated } : null))
      updateStoredWishlistTitle(creatorSecret, data.title)
    } catch (e: unknown) {
      setError(axios.isAxiosError(e) ? String(e.response?.data?.detail ?? e.message) : t('common.error'))
    }
  }

  const shareUrl = creatorSecret
    ? `${window.location.origin}/wishlists/s/${wishlist?.slug ?? ''}`
    : ''

  const copyLink = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const shareLink = async () => {
    if (!shareUrl) return
    if (canShare) {
      try {
        await navigator.share({
          title: wishlist?.title ?? t('wishlist.publicTitle'),
          url: shareUrl,
          text: wishlist?.title ?? t('wishlist.publicTitle'),
        })
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 2000)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyLink()
        }
      }
    } else {
      copyLink()
    }
  }

  const openModalForCreate = () => {
    setEditingItem(null)
    setFetchProductError(null)
    reset({ title: '', link: '', price: '', min_contribution: '', image_url: '' })
    setModalOpen(true)
  }

  const fetchProductByUrl = async () => {
    const link = getValues('link')?.trim()
    if (!link) {
      setFetchProductError(t('wishlist.fetchByUrlNoLink'))
      return
    }
    setFetchProductError(null)
    setFetchProductLoading(true)
    try {
      const { data } = await axios.post<FetchProductResponse>(`${API_URL}/wishlists/fetch-product`, { url: link })
      if (data.title != null) setValue('title', data.title)
      if (data.image_url != null) setValue('image_url', data.image_url)
      if (data.price != null) setValue('price', String(data.price))
    } catch (e: unknown) {
      setFetchProductError(axios.isAxiosError(e) ? String(e.response?.data?.detail ?? e.message) : t('wishlist.fetchByUrlError'))
    } finally {
      setFetchProductLoading(false)
    }
  }

  const openModalForEdit = (item: WishlistItemResponse) => {
    setEditingItem(item)
    setFetchProductError(null)
    setValue('title', item.title)
    setValue('link', item.link ?? '')
    setValue('price', item.price != null ? String(item.price) : '')
    setValue('min_contribution', item.min_contribution != null ? String(item.min_contribution) : '')
    setValue('image_url', item.image_url ?? '')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingItem(null)
    reset({ title: '', link: '', price: '', min_contribution: '', image_url: '' })
  }

  const onSaveItem = async (data: ItemFormValues) => {
    if (!creatorSecret) return
    setError(null)
    const payload = {
      title: data.title,
      link: data.link || null,
      price: data.price ? Number(data.price) : null,
      min_contribution: data.min_contribution ? Number(data.min_contribution) : null,
      image_url: data.image_url || null,
    }
    try {
      if (editingItem) {
        const { data: updated } = await axios.patch<WishlistItemResponse>(
          `${API_URL}/wishlists/m/${creatorSecret}/items/${editingItem.id}`,
          payload
        )
        setWishlist((w) =>
          w ? { ...w, items: w.items.map((i) => (i.id === editingItem.id ? updated : i)) } : null
        )
      } else {
        const { data: item } = await axios.post<WishlistItemResponse>(
          `${API_URL}/wishlists/m/${creatorSecret}/items`,
          payload
        )
        setWishlist((w) =>
          w ? { ...w, items: [...w.items, item] } : null
        )
      }
      closeModal()
    } catch (e: unknown) {
      setError(axios.isAxiosError(e) ? String(e.response?.data?.detail ?? e.message) : t('common.error'))
    }
  }

  const onDeleteItem = async (itemId: number, hasContributions = false) => {
    const msg = hasContributions ? t('wishlist.deleteItemWithContributionsConfirm') : t('wishlist.deleteItemConfirm')
    if (!creatorSecret || !confirm(msg)) return
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

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-live="polite">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-11 w-24" />
        </div>
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-24" />
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-11 w-28" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    )
  }
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
          <CardTitle>{t('wishlist.editList')}</CardTitle>
          <CardDescription>{t('wishlist.listTitle')}</CardDescription>
        </CardHeader>
        <form onSubmit={listForm.handleSubmit(onSaveList)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="list-title">{t('wishlist.listTitle')}</Label>
              <Input
                id="list-title"
                {...listForm.register('title', { required: true })}
                placeholder={t('wishlist.listTitlePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="list-occasion">{t('wishlist.occasion')}</Label>
              <Input
                id="list-occasion"
                {...listForm.register('occasion')}
                placeholder={t('wishlist.occasionPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="list-event_date">{t('wishlist.eventDate')}</Label>
              <Input
                id="list-event_date"
                type="date"
                {...listForm.register('event_date')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="list-currency">{t('wishlist.currency')}</Label>
              <Controller
                name="currency"
                control={listForm.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="list-currency" className="font-mono">
                      <SelectValue placeholder="RUB" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        ...(wishlist?.currency && !POPULAR_CURRENCIES.includes(wishlist.currency as (typeof POPULAR_CURRENCIES)[number])
                          ? [wishlist.currency]
                          : []),
                        ...POPULAR_CURRENCIES,
                      ].map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <Button type="submit" disabled={listForm.formState.isSubmitting}>
              {t('common.save')}
            </Button>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('wishlist.shareLink')}</CardTitle>
          <CardDescription>{t('wishlist.copyLink')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input readOnly value={shareUrl} className="font-mono text-sm flex-1 min-w-0" />
          {canShare && (
            <Button
              type="button"
              onClick={shareLink}
              className={shareSuccess ? 'opacity-90' : ''}
            >
              {shareSuccess ? t('wishlist.shared') : t('wishlist.share')}
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={copyLink}>
            {linkCopied ? t('wishlist.copied') : t('wishlist.copyLink')}
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{t('wishlist.manage')}</h2>
        <Button onClick={openModalForCreate} className="md:inline-flex hidden">
          {t('wishlist.addItem')}
        </Button>
      </div>

      {/* FAB: основное действие в зоне большого пальца на мобильных */}
      <Button
        type="button"
        size="icon"
        onClick={openModalForCreate}
        className="fixed bottom-20 right-4 z-10 shadow-lg md:hidden pb-[env(safe-area-inset-bottom)]"
        aria-label={t('wishlist.addItem')}
      >
        <Plus className="size-6" aria-hidden />
      </Button>

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? t('wishlist.editItemTitle') : t('wishlist.addItem')}
            </DialogTitle>
            <DialogDescription>
              {t('wishlist.itemTitle')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSaveItem)}>
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="modal-title">{t('wishlist.itemTitle')}</Label>
                <Input
                  id="modal-title"
                  {...register('title', { required: true })}
                  placeholder={t('wishlist.itemTitle')}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="modal-link">{t('wishlist.itemLink')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="modal-link"
                    {...register('link')}
                    type="url"
                    placeholder="https://..."
                    className="flex-1 min-w-0"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={fetchProductByUrl}
                    disabled={fetchProductLoading || !(linkValue ?? '')?.trim()}
                  >
                    {fetchProductLoading ? t('wishlist.fetchByUrlLoading') : t('wishlist.fetchByUrl')}
                  </Button>
                </div>
                {fetchProductError && (
                  <p className="text-sm text-destructive">{fetchProductError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-price">{t('wishlist.itemPrice')}</Label>
                <Input
                  id="modal-price"
                  {...register('price')}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-min-contribution">{t('wishlist.minContribution')}</Label>
                <Input
                  id="modal-min-contribution"
                  {...register('min_contribution')}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder={t('wishlist.minContributionPlaceholder')}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="modal-image">{t('wishlist.itemImage')}</Label>
                <Input
                  id="modal-image"
                  {...register('image_url')}
                  type="url"
                  placeholder="https://..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {editingItem ? t('common.save') : t('wishlist.addItem')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ul className="space-y-2">
        {wishlist.items.map((item) => (
          <li key={item.id}>
            <ItemRow
              item={item}
              currency={wishlist.currency ?? 'RUB'}
              onEdit={() => openModalForEdit(item)}
              onDelete={() => onDeleteItem(item.id, toNum(item.total_contributed) > 0)}
              t={t}
            />
          </li>
        ))}
      </ul>
      {wishlist.items.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('wishlist.noLists')}</p>
      )}

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
  currency,
  onEdit,
  onDelete,
  t,
}: {
  item: WishlistItemResponse
  currency: string
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
            loading="lazy"
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
              <p className="text-sm text-muted-foreground">
                {item.price} {currency}
              </p>
            )}
            {item.price != null && Number(item.price) > 0 && (
              <div className="mt-1 space-y-0.5">
                <p className="text-xs text-muted-foreground">
                  {t('wishlist.collected')} {toNum(item.total_contributed)} {t('wishlist.of')} {toNum(item.price)} {currency}
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
