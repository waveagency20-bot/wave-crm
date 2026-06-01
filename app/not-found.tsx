import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: '#060d06', color: 'white', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '440px' }}>
        <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 20px' }}>
          <Image src="/logo.webp" alt="Wave CRM" fill sizes="56px" style={{ objectFit: 'contain', borderRadius: '50%' }} />
        </div>
        <div style={{ fontSize: '72px', fontWeight: 800, color: '#00ff88', marginBottom: '8px' }}>404</div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'white', margin: '0 0 12px' }}>Page not found</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: '32px' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/dashboard" style={{ display: 'inline-block', padding: '13px 32px', borderRadius: '12px', background: 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '14px', fontWeight: 700, textDecoration: 'none', outline: '1px solid rgba(0,255,136,0.3)' }}>
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}