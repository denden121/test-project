import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/contexts/i18n-context'
import { useTheme } from '@/contexts/theme-context'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useI18n()
  const { theme, setTheme, resolvedTheme } = useTheme()

  const cycle = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const title =
    theme === 'system'
      ? resolvedTheme === 'dark'
        ? t('theme.systemDark')
        : t('theme.systemLight')
      : theme === 'dark'
        ? t('theme.dark')
        : t('theme.light')

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={cycle}
      className={cn(className)}
      title={title}
    >
      <span className="relative inline-flex h-4 w-4">
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute inset-0 h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      </span>
      <span className="sr-only">{t('theme.toggle')}</span>
    </Button>
  )
}
