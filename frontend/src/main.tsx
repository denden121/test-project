import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthProvider } from '@/contexts/auth-context'
import { I18nProvider } from '@/contexts/i18n-context'
import { ThemeProvider } from '@/contexts/theme-context'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>,
)
