import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/contexts/i18n-context'
import { API_URL, type ContributionResponse } from '@/lib/api'

export function MyContribution() {
  const { t } = useI18n()
  const { contributorSecret } = useParams<{ contributorSecret: string }>()
  const navigate = useNavigate()
  const [contribution, setContribution] = useState<ContributionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!contributorSecret) return
    axios
      .get<ContributionResponse>(`${API_URL}/contributions/${contributorSecret}`)
      .then((r) => setContribution(r.data))
      .catch((e) => setError(e.response?.data?.detail ?? e.message))
      .finally(() => setLoading(false))
  }, [contributorSecret])

  const onCancel = async () => {
    if (!contributorSecret || !confirm(t('wishlist.cancelContributionConfirm'))) return
    try {
      await axios.delete(`${API_URL}/contributions/${contributorSecret}`)
      setContribution(null)
      navigate('/')
    } catch (e: unknown) {
      setError(axios.isAxiosError(e) ? String(e.response?.data?.detail ?? e.message) : t('common.error'))
    }
  }

  if (loading) return <p className="text-muted-foreground">{t('common.loading')}</p>
  if (error && !contribution) return <p className="text-destructive">{t('common.error')}: {error}</p>
  if (!contribution) return <p className="text-muted-foreground">{t('common.notFound')}</p>

  const amount = typeof contribution.amount === 'string' ? parseFloat(contribution.amount) : contribution.amount

  return (
    <div className="mx-auto max-w-md space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('wishlist.myContribution')}</CardTitle>
          <CardDescription>
            {t('wishlist.contributedAmount')}: {amount} — {contribution.item_title ?? '—'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {new Date(contribution.contributed_at).toLocaleString()}
          </p>
          <Button variant="destructive" onClick={onCancel}>
            {t('wishlist.cancelContribution')}
          </Button>
        </CardContent>
      </Card>
      <Button variant="outline" asChild>
        <Link to="/">{t('common.back')}</Link>
      </Button>
    </div>
  )
}
