'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{ minHeight: '100vh', background: '#060d06', color: 'white', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '440px' }}>
        <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 20px' }}>
          <Image src="/logo.webp" alt="Wave CRM" fill sizes="56px" style={{ objectFit: 'contain', borderRadius: '50%' }} />
        </div>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'white', margin: '0 0 12px' }}>Something went wrong</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: '32px' }}>
          An unexpected error occurred. Our team has been notified. Please try again.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{ padding: '13px 28px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '14px', fontWeight: 700, outline: '1px solid rgba(0,255,136,0.3)' }}>
            Try again
          </button>
          <Link href="/dashboard"
            style={{ padding: '13px 28px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: 700, textDecoration: 'none', outline: '1px solid rgba(255,255,255,0.1)' }}>
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}