import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/contexts/i18n-context'
import { API_URL, type WishlistManageDetailResponse } from '@/lib/api'
import { getStoredWishlists } from '@/lib/wishlist-storage'

export function Dashboard() {
  const { t } = useI18n()
  const [lists, setLists] = useState<WishlistManageDetailResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = getStoredWishlists()
    if (stored.length === 0) {
      setLoading(false)
      return
    }
    Promise.all(
      stored.map((s) =>
        axios
          .get<WishlistManageDetailResponse>(`${API_URL}/wishlists/m/${s.creator_secret}`)
          .then((r) => r.data)
      )
    )
      .then(setLists)
      .catch((e) => setError(e.response?.data?.detail ?? e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-muted-foreground">{t('common.loading')}</p>
  }

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
        <ul className="grid gap-4 sm:grid-cols-2">
          {lists.map((w) => (
            <li key={w.id}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">{w.title}</CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/wishlists/manage/${w.creator_secret}`}>
                      {t('wishlist.manage')}
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {w.items.length}{' '}
                    {w.items.filter((i) => i.is_reserved).length > 0 &&
                      `· ${w.items.filter((i) => i.is_reserved).length} ${t('wishlist.reserved')}`}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t('wishlist.shareLink')}: /wishlists/s/{w.slug}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
