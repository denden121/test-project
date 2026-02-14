import { createSlice } from '@reduxjs/toolkit'

const TOKEN_KEY = 'auth_token'

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export type User = {
  id: number
  email: string
  created_at: string
  avatar_url?: string | null
}

type AuthState = {
  token: string | null
  user: User | null
  _hydrated: boolean
}

const initialState: AuthState = {
  token: getStoredToken(),
  user: null,
  _hydrated: false,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: { payload: { token: string; user: User } }) => {
      state.token = action.payload.token
      state.user = action.payload.user
    },
    setUser: (state, action: { payload: User }) => {
      state.user = action.payload
    },
    setHydrated: (state) => {
      state._hydrated = true
    },
    logout: (state) => {
      state.token = null
      state.user = null
    },
  },
})

export const { setCredentials, setUser, setHydrated, logout } = authSlice.actions
export default authSlice.reducer

export function persistToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}
