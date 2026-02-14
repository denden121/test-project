import { Link, Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BottomNav } from '@/components/bottom-nav'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/components/user-menu'
import { useAuth } from '@/hooks/use-auth'
import { useI18n } from '@/contexts/i18n-context'

export function Layout() {
  const { t } = useI18n()
  const { token } = useAuth()

  return (
    <div className="min-h-svh bg-background font-sans text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 min-h-[44px] max-w-4xl items-center justify-between gap-2 px-4 sm:gap-4">
          <Link
            to="/"
            className="flex min-h-[44px] min-w-[44px] items-center text-lg font-semibold hover:opacity-80 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t('wishlist.title')}
          </Link>
          <nav className="flex flex-wrap items-center gap-2" aria-label={t('nav.main')}>
            {token ? (
              <>
                <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                  <Link to="/">{t('nav.myLists')}</Link>
                </Button>
                <Button size="sm" asChild className="hidden sm:inline-flex">
                  <Link to="/wishlists/new">{t('nav.createList')}</Link>
                </Button>
                <UserMenu />
              </>
            ) : (
              <Button size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/login">{t('auth.login')}</Link>
              </Button>
            )}
            <LanguageSwitcher />
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
