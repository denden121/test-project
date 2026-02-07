import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/contexts/i18n-context'

export function Landing() {
  const { t } = useI18n()

  return (
    <div className="space-y-16 py-8">
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t('landing.heroTitle')}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          {t('landing.heroSubtitle')}
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">{t('landing.howItWorks')}</h2>
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. {t('landing.step1Title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t('landing.step1Text')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. {t('landing.step2Title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t('landing.step2Text')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. {t('landing.step3Title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t('landing.step3Text')}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-muted/30 p-8 text-center">
        <h2 className="text-xl font-semibold">{t('landing.ctaTitle')}</h2>
        <p className="mt-2 text-muted-foreground">{t('landing.ctaText')}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link to="/login">{t('landing.getStarted')}</Link>
          </Button>
          <span className="text-sm text-muted-foreground">{t('landing.haveAccount')}</span>
          <Button variant="outline" size="lg" asChild>
            <Link to="/login">{t('auth.login')}</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
