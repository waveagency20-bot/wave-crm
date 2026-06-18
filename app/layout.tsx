import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/auth'

export const metadata: Metadata = {
  title: 'Wave CRM — The CRM built for African businesses',
  description: 'Manage leads, close deals and grow faster with Wave CRM.',
  keywords: 'CRM, businesses, WhatsApp CRM, lead management',
  authors: [{ name: 'Wave Agency', url: 'https://waveagency.co.ke' }],
  icons: {
    icon: '/logo.webp',
    apple: '/logo.webp',
    shortcut: '/logo.webp',
  },
  openGraph: {
    title: 'Wave CRM',
    description: 'The CRM built for Businesses',
    url: 'https://wavecrm.co.ke',
    siteName: 'Wave CRM',
    locale: 'en_KE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wave CRM',
    description: 'The CRM built for Businesses',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        margin: 0,
        padding: 0,
        background: '#060d06',
      }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}