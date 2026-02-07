import { useEffect, useRef } from 'react'
import axios from 'axios'
import { useLazyGetMeQuery } from '@/store/api/authApi'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setUser, setHydrated, logout } from '@/store/slices/authSlice'

export function AuthInit({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const { token, user, _hydrated } = useAppSelector((s) => s.auth)
  const [getMe, { isUninitialized, isLoading, isSuccess, isError, data }] = useLazyGetMeQuery()
  const didRun = useRef(false)

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [token])

  useEffect(() => {
    if (_hydrated) return
    if (!token) {
      dispatch(setHydrated())
      return
    }
    if (user) {
      dispatch(setHydrated())
      return
    }
    if (isUninitialized && !didRun.current) {
      didRun.current = true
      getMe()
    }
  }, [token, user, _hydrated, isUninitialized, getMe, dispatch])

  useEffect(() => {
    if (isSuccess && data) {
      dispatch(setUser(data))
      dispatch(setHydrated())
    }
  }, [isSuccess, data, dispatch])

  useEffect(() => {
    if (isError && !isLoading) {
      dispatch(logout())
      dispatch(setHydrated())
    }
  }, [isError, isLoading, dispatch])

  return <>{children}</>
}
