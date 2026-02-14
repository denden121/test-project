import { Link, useLocation } from 'react-router-dom'
import { List, LogIn, LogOut, PlusCircle } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useI18n } from '@/contexts/i18n-context'
import { cn } from '@/lib/utils'

const navItemClass =
  'flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-none text-xs font-medium text-muted-foreground transition-colors touch-manipulation hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset aria-current-page:bg-muted/80 aria-current-page:text-foreground'

export function BottomNav() {
  const { t } = useI18n()
  const { token, logout } = useAuth()
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-border bg-background/95 backdrop-blur md:hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      aria-label={t('nav.main')}
    >
      {token ? (
        <>
          <Link
            to="/"
            className={cn(navItemClass)}
            aria-current={location.pathname === '/' ? 'page' : undefined}
          >
            <List className="size-6 shrink-0" aria-hidden />
            <span>{t('nav.myLists')}</span>
          </Link>
          <Link
            to="/wishlists/new"
            className={cn(navItemClass)}
            aria-current={location.pathname === '/wishlists/new' ? 'page' : undefined}
          >
            <PlusCircle className="size-6 shrink-0" aria-hidden />
            <span>{t('nav.createList')}</span>
          </Link>
          <button
            type="button"
            onClick={logout}
            className={cn(navItemClass, 'bg-transparent')}
          >
            <LogOut className="size-6 shrink-0" aria-hidden />
            <span>{t('auth.logout')}</span>
          </button>
        </>
      ) : (
        <Link
          to="/login"
          className={cn(navItemClass)}
          aria-current={location.pathname === '/login' ? 'page' : undefined}
        >
          <LogIn className="size-6 shrink-0" aria-hidden />
          <span>{t('auth.login')}</span>
        </Link>
      )}
    </nav>
  )
}
