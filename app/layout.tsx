import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/auth'

export const metadata: Metadata = {
  title: 'Wave CRM — The CRM built for African businesses',
  description: 'Manage leads, close deals and grow faster with Wave CRM. WhatsApp-first, AI-ready CRM built for businesses.',
  keywords: 'CRM, businesses, WhatsApp CRM, lead management',
  authors: [{ name: 'Wave Agency', url: 'https://waveagency.co.ke' }],
  openGraph: {
    title: 'Wave CRM',
    description: 'The CRM built for African businesses',
    url: 'https://wavecrm.co.ke',
    siteName: 'Wave CRM',
    locale: 'en_KE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wave CRM',
    description: 'The CRM built for African businesses',
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