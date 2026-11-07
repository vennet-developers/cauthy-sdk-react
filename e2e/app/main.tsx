import { createRoot } from 'react-dom/client'
import { CauthyProvider } from '@cauthyhq/react'
import '@cauthyhq/react/styles.css'
import { App } from './pages'

createRoot(document.getElementById('root')!).render(
  <CauthyProvider>
    <App />
  </CauthyProvider>,
)
