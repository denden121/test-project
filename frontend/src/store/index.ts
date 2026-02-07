import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import { authApi } from './api/authApi'
import { persistToken } from './slices/authSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware),
})

store.subscribe(() => {
  const state = store.getState()
  const token = state.auth.token
  persistToken(token)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
