import { Button } from '@/components/ui/button'
import { useI18n } from '@/contexts/i18n-context'
import { cn } from '@/lib/utils'
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n()

  return (
    <div className={cn('flex gap-1', className)} role="group" aria-label={t('lang.switch')}>
      <Button
        type="button"
        variant={locale === 'ru' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setLocale('ru')}
        title={t('lang.ru')}
      >
        RU
      </Button>
      <Button
        type="button"
        variant={locale === 'en' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setLocale('en')}
        title={t('lang.en')}
      >
        EN
      </Button>
    </div>
  )
}
