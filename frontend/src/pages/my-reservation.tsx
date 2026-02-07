import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/contexts/i18n-context'
import { API_URL, type ReservationResponse } from '@/lib/api'

export function MyReservation() {
  const { t } = useI18n()
  const { reserverSecret } = useParams<{ reserverSecret: string }>()
  const navigate = useNavigate()
  const [reservation, setReservation] = useState<ReservationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!reserverSecret) return
    axios
      .get<ReservationResponse>(`${API_URL}/reservations/${reserverSecret}`)
      .then((r) => setReservation(r.data))
      .catch((e) => setError(e.response?.data?.detail ?? e.message))
      .finally(() => setLoading(false))
  }, [reserverSecret])

  const onCancel = async () => {
    if (!reserverSecret || !confirm(t('wishlist.cancelConfirm'))) return
    try {
      await axios.delete(`${API_URL}/reservations/${reserverSecret}`)
      setReservation(null)
      navigate('/')
    } catch (e: unknown) {
      setError(axios.isAxiosError(e) ? String(e.response?.data?.detail ?? e.message) : t('common.error'))
    }
  }

  if (loading) return <p className="text-muted-foreground">{t('common.loading')}</p>
  if (error && !reservation) return <p className="text-destructive">{t('common.error')}: {error}</p>
  if (!reservation) return <p className="text-muted-foreground">{t('common.notFound')}</p>

  return (
    <div className="mx-auto max-w-md space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('wishlist.myReservation')}</CardTitle>
          <CardDescription>
            {t('wishlist.reservedItem')}: {reservation.item_title ?? '—'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {new Date(reservation.reserved_at).toLocaleString()}
          </p>
          <Button variant="destructive" onClick={onCancel}>
            {t('wishlist.cancelReservation')}
          </Button>
        </CardContent>
      </Card>
      <Button variant="outline" asChild>
        <Link to="/">{t('common.back')}</Link>
      </Button>
    </div>
  )
}
