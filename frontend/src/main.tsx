import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './App'
import { AuthInit } from '@/components/auth-init'
import { I18nProvider } from '@/contexts/i18n-context'
import { ThemeProvider } from '@/contexts/theme-context'
import { store } from '@/store'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <I18nProvider>
        <ThemeProvider>
          <AuthInit>
            <App />
          </AuthInit>
        </ThemeProvider>
      </I18nProvider>
    </Provider>
  </StrictMode>,
)
