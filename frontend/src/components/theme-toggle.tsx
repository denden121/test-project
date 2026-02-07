import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/contexts/i18n-context'
import { useTheme } from '@/contexts/theme-context'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useI18n()
  const { setTheme, resolvedTheme } = useTheme()

  // Один клик — переключение светлая ↔ тёмная
  const toggle = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const title =
    resolvedTheme === 'dark' ? t('theme.dark') : t('theme.light')

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={cn(className)}
      title={title}
    >
      <span className="inline-flex h-4 w-4 items-center justify-center">
        {resolvedTheme === 'dark' ? (
          <Moon className="h-4 w-4" aria-hidden />
        ) : (
          <Sun className="h-4 w-4" aria-hidden />
        )}
      </span>
      <span className="sr-only">{t('theme.toggle')}</span>
    </Button>
  )
}
