import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import useWebSocket from 'react-use-websocket'
import axios from 'axios'
import { Plus, Share2, ChevronLeft, MoreVertical, ChevronDown, Pencil, Trash2, Gift } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  const [listEditOpen, setListEditOpen] = useState(false)
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

  const wsUrl =
    !wishlist?.slug || !creatorSecret
      ? null
      : API_URL.startsWith('http')
        ? (() => {
            const u = new URL(API_URL)
            const proto = u.protocol === 'https:' ? 'wss' : 'ws'
            const path = u.pathname.replace(/\/$/, '') || ''
            return `${proto}://${u.host}${path}/wishlists/ws/${wishlist.slug}`
          })()
        : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}${API_URL}/wishlists/ws/${wishlist.slug}`

  useWebSocket(wsUrl, {
    onMessage: () => {
      if (!creatorSecret) return
      axios
        .get<WishlistManageDetailResponse>(`${API_URL}/wishlists/m/${creatorSecret}`)
        .then((r) => setWishlist(r.data))
        .catch(() => {})
    },
    shouldReconnect: () => true,
  })

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
    <div className="space-y-4">
      {/* Header: back, title, kebab */}
      <div className="flex min-h-[44px] items-center justify-between gap-2">
        <Button variant="ghost" size="icon" className="shrink-0" asChild>
          <Link to="/" aria-label={t('common.back')}>
            <ChevronLeft className="size-6" aria-hidden />
          </Link>
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-center text-lg font-semibold" id="wishlist-title">
          {wishlist.title}
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0" aria-label={t('wishlist.manage')}>
              <MoreVertical className="size-5" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setListEditOpen(true)}>
              <Pencil className="size-4 shrink-0" aria-hidden />
              {t('wishlist.editList')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={shareLink}>
              <Share2 className="size-4 shrink-0" aria-hidden />
              {t('wishlist.share')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDeleteList} className="text-destructive focus:text-destructive">
              <Trash2 className="size-4 shrink-0" aria-hidden />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Two main action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" className="h-auto flex-col gap-1.5 py-4" onClick={openModalForCreate}>
          <Plus className="size-6 shrink-0" aria-hidden />
          <span>{t('wishlist.addGift')}</span>
        </Button>
        <Button type="button" variant="outline" className="h-auto flex-col gap-1.5 py-4" onClick={shareLink}>
          <Share2 className="size-6 shrink-0" aria-hidden />
          <span>{shareSuccess ? t('wishlist.shared') : linkCopied ? t('wishlist.copied') : t('wishlist.shareWishlist')}</span>
        </Button>
      </div>

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
                  maxLength={200}
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

      {/* List edit dialog (opened from header kebab) */}
      <Dialog open={listEditOpen} onOpenChange={setListEditOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('wishlist.editList')}</DialogTitle>
            <DialogDescription>{t('wishlist.listTitle')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={listForm.handleSubmit((d) => { onSaveList(d); setListEditOpen(false); })}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="list-title">{t('wishlist.listTitle')}</Label>
                <Input
                  id="list-title"
                  maxLength={200}
                  {...listForm.register('title', { required: true })}
                  placeholder={t('wishlist.listTitlePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="list-occasion">{t('wishlist.occasion')}</Label>
                <Input
                  id="list-occasion"
                  maxLength={200}
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
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setListEditOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={listForm.formState.isSubmitting}>
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
  const [expanded, setExpanded] = useState(false)
  const hasExtra = Boolean(item.link || item.is_reserved || (item.price != null && Number(item.price) > 0 && toNum(item.total_contributed) > 0))

  return (
    <Card>
      <CardContent className="flex gap-3 p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt=""
              className="h-14 w-14 rounded-lg object-cover"
              loading="lazy"
            />
          ) : (
            <Gift className="size-7 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {item.is_reserved && (
                <span className="text-xs font-medium text-destructive">{t('wishlist.reserved')}</span>
              )}
              <p className="font-medium leading-tight">{item.title}</p>
              {item.price != null && (
                <p className="text-sm text-primary">
                  {typeof item.price === 'number' ? item.price.toLocaleString() : item.price} {currency}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={t('wishlist.manage')}>
                  <MoreVertical className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="size-4 shrink-0" aria-hidden />
                  {t('wishlist.editItem')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="size-4 shrink-0" aria-hidden />
                  {t('wishlist.deleteItem')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {hasExtra && (
            <button
              type="button"
              className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? t('wishlist.collapseComment') : t('wishlist.expandComment')}
              <ChevronDown className={`size-3.5 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
            </button>
          )}
          {expanded && hasExtra && (
            <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-primary underline"
                >
                  {item.link}
                </a>
              )}
              {item.price != null && Number(item.price) > 0 && (
                <div className="space-y-0.5">
                  <p>
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
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
