import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { Landing } from '@/pages/landing'
import { LoginPage } from '@/pages/login-page'
import { Dashboard } from '@/pages/dashboard'
import { CreateWishlist } from '@/pages/create-wishlist'
import { ManageWishlist } from '@/pages/manage-wishlist'
import { PublicWishlist } from '@/pages/public-wishlist'
import { MyReservation } from '@/pages/my-reservation'
import { MyContribution } from '@/pages/my-contribution'
import { useAuth } from '@/hooks/use-auth'

function HomeOrDashboard() {
  const { token, loading } = useAuth()
  if (loading) return <p className="text-muted-foreground">...</p>
  return token ? <Dashboard /> : <Landing />
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth()
  if (loading) return null
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomeOrDashboard />} />
          <Route path="login" element={<LoginPage />} />
          <Route
            path="wishlists/new"
            element={
              <RequireAuth>
                <CreateWishlist />
              </RequireAuth>
            }
          />
          <Route path="wishlists/manage/:creatorSecret" element={<ManageWishlist />} />
          <Route path="wishlists/s/:slug" element={<PublicWishlist />} />
          <Route path="reservations/:reserverSecret" element={<MyReservation />} />
          <Route path="contributions/:contributorSecret" element={<MyContribution />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
