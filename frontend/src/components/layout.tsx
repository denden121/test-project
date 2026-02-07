import { Link, Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/hooks/use-auth'
import { useI18n } from '@/contexts/i18n-context'

export function Layout() {
  const { t } = useI18n()
  const { token, user, logout } = useAuth()

  return (
    <div className="min-h-svh bg-background font-sans text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4">
          <Link to="/" className="text-lg font-semibold hover:opacity-80">
            {t('wishlist.title')}
          </Link>
          <nav className="flex flex-wrap items-center gap-2">
            {token ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/">{t('nav.myLists')}</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/wishlists/new">{t('nav.createList')}</Link>
                </Button>
                <span className="text-sm text-muted-foreground">{user?.email}</span>
                <Button variant="outline" size="sm" onClick={logout}>
                  {t('auth.logout')}
                </Button>
              </>
            ) : null}
            <LanguageSwitcher />
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
