import Link from 'next/link'
import Image from 'next/image'

export default function SuspendedPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#060d06', color: 'white', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>

      <div style={{ position: 'relative', width: 56, height: 56, marginBottom: '20px' }}>
        <Image src="/logo.webp" alt="Wave CRM" fill sizes="56px" style={{ objectFit: 'contain', borderRadius: '50%' }} />
      </div>

      <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🚫</div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'white', margin: '0 0 12px' }}>
          Account Suspended
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: '0 0 28px' }}>
          Your Wave CRM account has been suspended. This may be due to a missed payment or a violation of our terms of service.
        </p>

        <div style={{ padding: '20px 24px', borderRadius: '16px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', marginBottom: '28px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.7 }}>
            Please contact Wave Agency to resolve this issue and restore access to your account.
          </p>
        </div>

        <a href="https://wa.me/254700000000" target="_blank" rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 28px', borderRadius: '12px', background: 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '14px', fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(0,255,136,0.3)', marginBottom: '16px' }}>
          💬 WhatsApp Wave Agency
        </a>

        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', margin: '16px 0 0' }}>
          Already resolved?{' '}
          <Link href="/login" style={{ color: '#00ff88', textDecoration: 'none' }}>
            Try signing in
          </Link>
        </p>
      </div>
    </div>
  )
}