import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useWebSocket } from 'react-use-websocket'
import axios from 'axios'
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
import { useI18n } from '@/contexts/i18n-context'
import {
  API_URL,
  type WishlistPublicResponse,
  type ReservationCreatedResponse,
  type ContributionCreatedResponse,
} from '@/lib/api'

type ReserveFormValues = { reserver_name: string }
type ContributeFormValues = { contributor_name: string; amount: string }

export function PublicWishlist() {
  const { t } = useI18n()
  const { slug } = useParams<{ slug: string }>()
  const [wishlist, setWishlist] = useState<WishlistPublicResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reservingItemId, setReservingItemId] = useState<number | null>(null)
  const [reservedResult, setReservedResult] = useState<ReservationCreatedResponse | null>(null)
  const [contributingItemId, setContributingItemId] = useState<number | null>(null)
  const [contributedResult, setContributedResult] = useState<ContributionCreatedResponse | null>(null)

  const reserveForm = useForm<ReserveFormValues>({ defaultValues: { reserver_name: '' } })
  const contributeForm = useForm<ContributeFormValues>({
    defaultValues: { contributor_name: '', amount: '' },
  })

  useEffect(() => {
    if (!slug) return
    axios
      .get<WishlistPublicResponse>(`${API_URL}/wishlists/s/${slug}`)
      .then((r) => setWishlist(r.data))
      .catch((e) => setError(e.response?.data?.detail ?? e.message))
      .finally(() => setLoading(false))
  }, [slug])

  const wsUrl =
    !slug
      ? null
      : API_URL.startsWith('http')
        ? (() => {
            const u = new URL(API_URL)
            const proto = u.protocol === 'https:' ? 'wss' : 'ws'
            const path = u.pathname.replace(/\/$/, '') || ''
            return `${proto}://${u.host}${path}/wishlists/ws/${slug}`
          })()
        : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}${API_URL}/wishlists/ws/${slug}`

  useWebSocket(wsUrl, {
    onMessage: (e) => {
      try {
        const data = JSON.parse(e.data) as WishlistPublicResponse
        setWishlist(data)
      } catch {
        /* ignore */
      }
    },
    shouldReconnect: () => true,
  })

  const onReserve = async (itemId: number, data: ReserveFormValues) => {
    if (!slug) return
    setError(null)
    try {
      const { data: result } = await axios.post<ReservationCreatedResponse>(
        `${API_URL}/wishlists/s/${slug}/items/${itemId}/reserve`,
        { reserver_name: data.reserver_name }
      )
      setReservedResult(result)
      setReservingItemId(null)
      reserveForm.reset()
      setWishlist((w) =>
        w
          ? {
              ...w,
              items: w.items.map((i) =>
                i.id === itemId ? { ...i, is_reserved: true } : i
              ),
            }
          : null
      )
    } catch (e: unknown) {
      setError(axios.isAxiosError(e) ? String(e.response?.data?.detail ?? e.message) : t('common.error'))
    }
  }

  const onContribute = async (itemId: number, data: ContributeFormValues) => {
    if (!slug) return
    setError(null)
    try {
      const { data: result } = await axios.post<ContributionCreatedResponse>(
        `${API_URL}/wishlists/s/${slug}/items/${itemId}/contribute`,
        { contributor_name: data.contributor_name, amount: Number(data.amount) }
      )
      setContributedResult(result)
      setContributingItemId(null)
      contributeForm.reset()
      const contributed = Number(data.amount)
      setWishlist((w) =>
        w
          ? {
              ...w,
              items: w.items.map((i) => {
                if (i.id !== itemId) return i
                const prev = Number(i.total_contributed ?? 0)
                return { ...i, total_contributed: prev + contributed }
              }),
            }
          : null
      )
    } catch (e: unknown) {
      setError(axios.isAxiosError(e) ? String(e.response?.data?.detail ?? e.message) : t('common.error'))
    }
  }

  function toNum(v: number | string | null | undefined): number {
    if (v == null) return 0
    return typeof v === 'string' ? parseFloat(v) || 0 : v
  }

  if (loading) return <p className="text-muted-foreground">{t('common.loading')}</p>
  if (error && !wishlist) return <p className="text-destructive">{t('common.error')}: {error}</p>
  if (!wishlist) return <p className="text-muted-foreground">{t('common.notFound')}</p>

  const reservationUrl = reservedResult
    ? `${window.location.origin}/reservations/${reservedResult.reserver_secret}`
    : ''

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{wishlist.title}</h1>
      <p className="text-muted-foreground">{t('wishlist.publicTitle')}</p>

      {reservedResult && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle>{t('wishlist.reservedSuccess')}</CardTitle>
            <CardDescription>
              <a href={reservationUrl} className="text-primary underline">
                {reservationUrl}
              </a>
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link to={`/reservations/${reservedResult.reserver_secret}`}>
                {t('wishlist.myReservation')}
              </Link>
            </Button>
          </CardFooter>
        </Card>
      )}

      {contributedResult && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle>{t('wishlist.chipInSuccess')}</CardTitle>
            <CardDescription>
              <Link to={`/contributions/${contributedResult.contributor_secret}`} className="text-primary underline">
                {t('wishlist.myContribution')}
              </Link>
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link to={`/contributions/${contributedResult.contributor_secret}`}>
                {t('wishlist.myContribution')}
              </Link>
            </Button>
          </CardFooter>
        </Card>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {wishlist.items.map((item) => (
          <li key={item.id}>
            <Card>
              {item.image_url && (
                <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                  <img
                    src={item.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline"
                  >
                    {item.link}
                  </a>
                )}
                {item.price != null && (
                  <p className="text-sm text-muted-foreground">{item.price}</p>
                )}
                {item.price != null && toNum(item.price) > 0 && !item.is_reserved && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{t('wishlist.collected')} {toNum(item.total_contributed)} {t('wishlist.of')} {toNum(item.price)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${Math.min(100, (toNum(item.total_contributed) / toNum(item.price)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {item.is_reserved ? (
                  <p className="text-sm text-muted-foreground">{t('wishlist.reserved')}</p>
                ) : reservingItemId === item.id ? (
                  <form
                    onSubmit={reserveForm.handleSubmit((data) => onReserve(item.id, data))}
                    className="space-y-2"
                  >
                    <Label htmlFor={`reserver-${item.id}`}>{t('wishlist.reserveName')}</Label>
                    <Input
                      id={`reserver-${item.id}`}
                      {...reserveForm.register('reserver_name', { required: true })}
                      placeholder={t('wishlist.reserveNamePlaceholder')}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button type="submit" disabled={reserveForm.formState.isSubmitting}>
                        {t('wishlist.reserveSubmit')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setReservingItemId(null)}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </form>
                ) : contributingItemId === item.id ? (
                  <form
                    onSubmit={contributeForm.handleSubmit((data) => onContribute(item.id, data))}
                    className="space-y-2"
                  >
                    <Label htmlFor={`contributor-name-${item.id}`}>{t('wishlist.chipInName')}</Label>
                    <Input
                      id={`contributor-name-${item.id}`}
                      {...contributeForm.register('contributor_name', { required: true })}
                      placeholder={t('wishlist.chipInNamePlaceholder')}
                    />
                    <Label htmlFor={`contributor-amount-${item.id}`}>{t('wishlist.chipInAmount')}</Label>
                    <Input
                      id={`contributor-amount-${item.id}`}
                      type="number"
                      step="0.01"
                      min="0.01"
                      {...contributeForm.register('amount', { required: true, min: 0.01 })}
                    />
                    <div className="flex gap-2">
                      <Button type="submit" disabled={contributeForm.formState.isSubmitting}>
                        {t('wishlist.chipInSubmit')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setContributingItemId(null)}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setReservingItemId(item.id)}
                    >
                      {t('wishlist.reserve')}
                    </Button>
                    {item.price != null && toNum(item.price) > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setContributingItemId(item.id)}
                      >
                        {t('wishlist.chipIn')}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
