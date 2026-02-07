import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'auth_token'

export type User = {
  id: number
  email: string
  created_at: string
}

type AuthContextValue = {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  setAuthFromToken: (accessToken: string, user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getStoredToken)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const setAuth = useCallback((accessToken: string | null, userData: User | null) => {
    setTokenState(accessToken)
    setUser(userData)
    if (accessToken) {
      localStorage.setItem(TOKEN_KEY, accessToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    } else {
      localStorage.removeItem(TOKEN_KEY)
      delete axios.defaults.headers.common['Authorization']
    }
  }, [])

  const setAuthFromToken = useCallback(
    (accessToken: string, userData: User) => {
      setAuth(accessToken, userData)
    },
    [setAuth]
  )

  const logout = useCallback(() => {
    setAuth(null, null)
  }, [setAuth])

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await axios.post<{ access_token: string; user: User }>(
        `${API_URL}/auth/login`,
        { email, password }
      )
      setAuth(data.access_token, data.user)
    },
    [setAuth]
  )

  const register = useCallback(
    async (email: string, password: string) => {
      const { data } = await axios.post<{ access_token: string; user: User }>(
        `${API_URL}/auth/register`,
        { email, password }
      )
      setAuth(data.access_token, data.user)
    },
    [setAuth]
  )

  useEffect(() => {
    const t = getStoredToken()
    if (!t) {
      setLoading(false)
      return
    }
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`
    axios
      .get<User>(`${API_URL}/auth/me`)
      .then((res) => {
        setUser(res.data)
        setTokenState(t)
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        setTokenState(null)
        setUser(null)
        delete axios.defaults.headers.common['Authorization']
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        setAuthFromToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
