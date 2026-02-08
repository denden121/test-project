import { useCallback } from 'react'
import {
  useLoginMutation,
  useRegisterMutation,
  useLoginWithGoogleMutation,
} from '@/store/api/authApi'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setCredentials, logout as logoutAction } from '@/store/slices/authSlice'
import type { User } from '@/store/slices/authSlice'

export function useAuth() {
  const dispatch = useAppDispatch()
  const { token, user, _hydrated } = useAppSelector((s) => s.auth)
  const [loginMutation] = useLoginMutation()
  const [registerMutation] = useRegisterMutation()
  const [loginWithGoogleMutation] = useLoginWithGoogleMutation()

  const loading = !_hydrated

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation({ email, password }).unwrap()
      dispatch(setCredentials({ token: result.access_token, user: result.user }))
    },
    [loginMutation, dispatch]
  )

  const register = useCallback(
    async (email: string, password: string) => {
      const result = await registerMutation({ email, password }).unwrap()
      dispatch(setCredentials({ token: result.access_token, user: result.user }))
    },
    [registerMutation, dispatch]
  )

  const loginWithGoogle = useCallback(
    async (code: string, redirectUri: string) => {
      const result = await loginWithGoogleMutation({ code, redirect_uri: redirectUri }).unwrap()
      dispatch(setCredentials({ token: result.access_token, user: result.user }))
    },
    [loginWithGoogleMutation, dispatch]
  )

  const logout = useCallback(() => {
    dispatch(logoutAction())
  }, [dispatch])

  return {
    user,
    token,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
  }
}

export type { User }
