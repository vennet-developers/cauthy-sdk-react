import type { ReactNode } from 'react'
import { CauthyProvider } from '@cauthyhq/react'
import '@cauthyhq/react/styles.css'

export const metadata = { title: 'Acme CRM' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CauthyProvider initialSession={null}>{children}</CauthyProvider>
      </body>
    </html>
  )
}
