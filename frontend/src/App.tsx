import { lazy, Suspense } from 'react'
import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { DashboardSkeleton } from '@/components/dashboard-skeleton'
import { useAuth } from '@/hooks/use-auth'

const Landing = lazy(() => import('@/pages/landing').then((m) => ({ default: m.Landing })))
const LoginPage = lazy(() => import('@/pages/login-page').then((m) => ({ default: m.LoginPage })))
const AuthCallbackPage = lazy(() => import('@/pages/auth-callback-page').then((m) => ({ default: m.AuthCallbackPage })))
const Dashboard = lazy(() => import('@/pages/dashboard').then((m) => ({ default: m.Dashboard })))
const CreateWishlist = lazy(() => import('@/pages/create-wishlist').then((m) => ({ default: m.CreateWishlist })))
const ManageWishlist = lazy(() => import('@/pages/manage-wishlist').then((m) => ({ default: m.ManageWishlist })))
const PublicWishlist = lazy(() => import('@/pages/public-wishlist').then((m) => ({ default: m.PublicWishlist })))
const MyReservation = lazy(() => import('@/pages/my-reservation').then((m) => ({ default: m.MyReservation })))
const MyContribution = lazy(() => import('@/pages/my-contribution').then((m) => ({ default: m.MyContribution })))
const Profile = lazy(() => import('@/pages/profile').then((m) => ({ default: m.Profile })))
const ForgotPasswordPage = lazy(() => import('@/pages/forgot-password-page').then((m) => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/pages/reset-password-page').then((m) => ({ default: m.ResetPasswordPage })))

function HomeOrDashboard() {
  const { token, loading } = useAuth()
  if (loading) return <DashboardSkeleton />
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
      <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-6 pb-32 md:pb-6"><DashboardSkeleton /></div>}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomeOrDashboard />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="auth/callback" element={<AuthCallbackPage />} />
          <Route
            path="wishlists/new"
            element={
              <RequireAuth>
                <CreateWishlist />
              </RequireAuth>
            }
          />
          <Route
            path="profile"
            element={
              <RequireAuth>
                <Profile />
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
      </Suspense>
    </BrowserRouter>
  )
}
