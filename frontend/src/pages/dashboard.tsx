import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Gift, MoreVertical, Pencil, Share2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DashboardSkeleton } from '@/components/dashboard-skeleton'
import { useI18n } from '@/contexts/i18n-context'
import { API_URL, type WishlistManageDetailResponse } from '@/lib/api'
import { removeStoredWishlist } from '@/lib/wishlist-storage'

function giftCountKey(count: number): string {
  if (count === 1) return 'wishlist.giftCount_one'
  if (count >= 2 && count <= 4) return 'wishlist.giftCount_few'
  return 'wishlist.giftCount_many'
}

export function Dashboard() {
  const { t } = useI18n()
  const [lists, setLists] = useState<WishlistManageDetailResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    axios
      .get<WishlistManageDetailResponse[]>(`${API_URL}/wishlists/mine`)
      .then((r) => setLists(r.data))
      .catch((e) => setError(e.response?.data?.detail ?? e.message))
      .finally(() => setLoading(false))
  }, [])

  const shareList = (w: WishlistManageDetailResponse) => {
    const url = `${window.location.origin}/wishlists/s/${w.slug}`
    const nav = typeof navigator !== 'undefined' ? navigator : null
    if (nav?.share) {
      nav.share({ title: w.title, url, text: w.title }).catch(() => {
        nav.clipboard?.writeText(url)
      })
    } else {
      nav?.clipboard?.writeText(url)
    }
  }

  const deleteList = async (w: WishlistManageDetailResponse) => {
    if (!confirm(t('wishlist.deleteConfirm'))) return
    try {
      await axios.delete(`${API_URL}/wishlists/m/${w.creator_secret}`)
      removeStoredWishlist(w.creator_secret)
      setLists((prev) => prev.filter((l) => l.creator_secret !== w.creator_secret))
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? e.response?.data?.detail ?? e.message : (e as Error).message
      setError(String(msg))
    }
  }

  if (loading) return <DashboardSkeleton />

  if (error) {
    return <p className="text-destructive">{t('common.error')}: {error}</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('wishlist.myLists')}</h1>
        <Button asChild>
          <Link to="/wishlists/new">{t('wishlist.createNew')}</Link>
        </Button>
      </div>

      {lists.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('wishlist.myLists')}</CardTitle>
            <CardDescription>{t('wishlist.noLists')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/wishlists/new">{t('wishlist.createNew')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {lists.map((w) => {
            const count = w.items.length
            const giftLabel = t(giftCountKey(count)).replace('{{count}}', String(count))
            return (
              <li key={w.id}>
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Link
                      to={`/wishlists/manage/${w.creator_secret}`}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Gift className="size-6 text-primary" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-tight">{w.title}</p>
                        <p className="text-sm text-muted-foreground">{giftLabel}</p>
                      </div>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label={t('wishlist.manage')}>
                          <MoreVertical className="size-5" aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/wishlists/manage/${w.creator_secret}`}>
                            <Pencil className="size-4 shrink-0" aria-hidden />
                            {t('wishlist.edit')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => shareList(w)}>
                          <Share2 className="size-4 shrink-0" aria-hidden />
                          {t('wishlist.share')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deleteList(w)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4 shrink-0" aria-hidden />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
