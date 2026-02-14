import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { User } from '@/store/slices/authSlice'
import { API_URL } from '@/lib/api'

type LoginRequest = { email: string; password: string }
type LoginResponse = { access_token: string; user: User }
type GoogleLoginRequest = { code: string; redirect_uri: string }
type UserUpdateRequest = { avatar_url?: string | null }

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/auth`,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as { auth?: { token: string | null } }).auth?.token
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: 'login', method: 'POST', body }),
    }),
    register: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: 'register', method: 'POST', body }),
    }),
    loginWithGoogle: builder.mutation<LoginResponse, GoogleLoginRequest>({
      query: (body) => ({ url: 'google', method: 'POST', body }),
    }),
    getMe: builder.query<User, void>({
      query: () => ({ url: 'me' }),
    }),
    updateMe: builder.mutation<User, UserUpdateRequest>({
      query: (body) => ({ url: 'me', method: 'PATCH', body }),
    }),
    uploadAvatar: builder.mutation<User, File>({
      query: (file) => {
        const formData = new FormData()
        formData.append('file', file)
        return { url: 'me/avatar', method: 'POST', body: formData }
      },
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useLoginWithGoogleMutation,
  useLazyGetMeQuery,
  useUpdateMeMutation,
  useUploadAvatarMutation,
} = authApi
