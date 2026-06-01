'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

const ADMIN_PASSWORD = 'WaveCRM@Admin2026'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const auth = sessionStorage.getItem('wave_admin_auth')
    if (auth === 'true') setAuthenticated(true)
    setLoading(false)
  }, [])

  const handleLogin = () => {
    if (!password) { setError('Please enter the admin password'); return }
    setSubmitting(true)
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('wave_admin_auth', 'true')
        setAuthenticated(true)
        setError('')
      } else {
        setError('Incorrect password. Please try again.')
        setPassword('')
      }
      setSubmitting(false)
    }, 800)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('wave_admin_auth')
    setAuthenticated(false)
    setPassword('')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#060d06', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div style={{
        minHeight: '100vh', background: '#060d06', color: 'white',
        fontFamily: 'system-ui, sans-serif', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '24px',
      }}>
        {/* Background glow */}
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,107,0.05), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ position: 'relative', width: 56, height: 56, marginBottom: '14px' }}>
              <Image src="/logo.webp" alt="Wave CRM" fill sizes="56px" style={{ objectFit: 'contain', borderRadius: '50%' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '20px', color: 'white' }}>
              wave.<span style={{ color: '#00ff88' }}>crm</span>
            </span>
            <span style={{ fontSize: '11px', padding: '2px 12px', borderRadius: '20px', background: 'rgba(255,107,107,0.15)', color: '#ff6b6b', fontWeight: 600, marginTop: '8px' }}>
              SUPER ADMIN ACCESS
            </span>
          </div>

          {/* Login card */}
          <div style={{ borderRadius: '20px', background: 'rgba(10,20,10,0.9)', border: '1px solid rgba(255,107,107,0.15)', overflow: 'hidden' }}>

            <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', margin: '0 0 4px' }}>
                Restricted Access
              </h2>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                This area is only accessible to Wave Agency administrators
              </p>
            </div>

            <div style={{ padding: '24px 28px' }}>

              {/* Warning */}
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>🔒</span>
                <p style={{ fontSize: '12px', color: 'rgba(255,107,107,0.8)', margin: 0, lineHeight: 1.5 }}>
                  Unauthorised access is strictly prohibited and will be logged.
                </p>
              </div>

              {/* Password input */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                  Admin Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter admin password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${error ? 'rgba(255,107,107,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '10px', padding: '11px 44px 11px 14px',
                      color: 'white', fontSize: '14px', outline: 'none',
                      boxSizing: 'border-box' as const, fontFamily: 'inherit',
                      letterSpacing: showPassword ? 'normal' : '0.1em',
                    }}
                    onFocus={e => e.target.style.borderColor = error ? 'rgba(255,107,107,0.5)' : 'rgba(0,255,136,0.4)'}
                    onBlur={e => e.target.style.borderColor = error ? 'rgba(255,107,107,0.5)' : 'rgba(255,255,255,0.1)'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, padding: 0 }}>
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
                {error && (
                  <p style={{ fontSize: '11px', color: '#ff6b6b', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ⚠ {error}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                onClick={handleLogin}
                disabled={submitting || !password}
                style={{
                  width: '100%', padding: '13px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  background: submitting || !password ? 'rgba(255,107,107,0.08)' : 'rgba(255,107,107,0.15)',
                  color: submitting || !password ? 'rgba(255,107,107,0.4)' : '#ff6b6b',
                  fontSize: '14px', fontWeight: 700, outline: '1px solid rgba(255,107,107,0.25)',
                  opacity: submitting ? 0.6 : 1, transition: 'all 0.2s', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { if (!submitting && password) e.currentTarget.style.background = 'rgba(255,107,107,0.25)' }}
                onMouseLeave={e => e.currentTarget.style.background = submitting || !password ? 'rgba(255,107,107,0.08)' : 'rgba(255,107,107,0.15)'}>
                {submitting ? 'Verifying...' : '🔓 Access Admin Panel'}
              </button>

              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '16px', marginBottom: 0 }}>
                Forgot the password?{' '}
                <a href="mailto:admin@waveagency.co.ke" style={{ color: '#00ff88', textDecoration: 'none' }}>
                  Contact Wave Agency
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Logout button — floating */}
      <button
        onClick={handleLogout}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 999,
          padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
          background: 'rgba(255,107,107,0.12)', color: '#ff6b6b', fontSize: '12px', fontWeight: 600,
          outline: '1px solid rgba(255,107,107,0.25)', transition: 'all 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,107,0.25)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,107,107,0.12)'}>
        🔒 Logout Admin
      </button>
      {children}
    </div>
  )
}