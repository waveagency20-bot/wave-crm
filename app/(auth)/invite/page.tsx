'use client'

import { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function InviteContent() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validating, setValidating] = useState(true)
  const [email, setEmail] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase puts session in URL hash after invite click
    const handleHashChange = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (session?.user) {
        setEmail(session.user.email || '')
        setReady(true)
        setValidating(false)
        return
      }

      // Try to get session from URL hash (Supabase sets this on invite click)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (accessToken && refreshToken) {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (data.session?.user) {
          setEmail(data.session.user.email || '')
          setReady(true)
          setValidating(false)
          return
        }
      }

      // No session found
      setValidating(false)
      setReady(false)
    }

    handleHashChange()
  }, [])

  const handleSetPassword = async () => {
    setError('')
    if (!name) { setError('Please enter your name'); return }
    if (!password) { setError('Please enter a password'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }

    setLoading(true)
    try {
      // Update password
      const { error: passError } = await supabase.auth.updateUser({ password })
      if (passError) throw passError

      // Update user profile name and status
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('users')
          .update({ name, status: 'active' })
          .eq('auth_id', user.id)
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
    padding: '11px 14px', color: 'white', fontSize: '13px',
    outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit',
  }

  const labelStyle = {
    fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
    display: 'block', marginBottom: '6px',
  }

  if (validating) {
    return (
      <div style={{ minHeight: '100vh', background: '#060d06', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Validating invite link...</div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', background: '#060d06', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>Invalid invite link</h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '24px' }}>
            This invite link is invalid or has expired. Please ask your admin to send a new invite.
          </p>
          <a href="/login" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: '12px', background: 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '14px', fontWeight: 700, textDecoration: 'none', outline: '1px solid rgba(0,255,136,0.3)' }}>
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060d06', color: 'white', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>

      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,136,0.06), transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ position: 'relative', width: 52, height: 52, marginBottom: '14px' }}>
            <Image src="/logo.webp" alt="Wave CRM" fill sizes="52px" style={{ objectFit: 'contain', borderRadius: '50%' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '20px', color: 'white' }}>
            wave.<span style={{ color: '#00ff88' }}>crm</span>
          </span>
        </div>

        <div style={{ borderRadius: '20px', background: 'rgba(10,20,10,0.9)', border: '1px solid rgba(0,255,136,0.15)', overflow: 'hidden' }}>

          <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>👋</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', margin: '0 0 6px' }}>
              You've been invited!
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>
              You've been added to a Wave CRM workspace
              {email && <> as <strong style={{ color: 'white' }}>{email}</strong></>}.
              Set your name and password to get started.
            </p>
          </div>

          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)' }}>
                <p style={{ fontSize: '12px', color: '#ff6b6b', margin: 0 }}>⚠ {error}</p>
              </div>
            )}

            <div>
              <label style={labelStyle}>Your Full Name</label>
              <input style={inputStyle} placeholder="e.g. Mary Otieno" value={name}
                onChange={e => setName(e.target.value)}
                onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>

            <div>
              <label style={labelStyle}>Set Password</label>
              <input style={inputStyle} type="password" placeholder="Min 8 characters" value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>

            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input style={inputStyle} type="password" placeholder="Repeat password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSetPassword() }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>

            {/* Password strength */}
            {password && (
              <div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                  {[1, 2, 3, 4].map(i => {
                    const strength = password.length >= 12 ? 4 : password.length >= 10 ? 3 : password.length >= 8 ? 2 : 1
                    return (
                      <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= strength ? (strength >= 3 ? '#00ff88' : strength === 2 ? '#fbbf24' : '#ff6b6b') : 'rgba(255,255,255,0.1)' }} />
                    )
                  })}
                </div>
                <span style={{ fontSize: '11px', color: password.length >= 12 ? '#00ff88' : password.length >= 8 ? '#fbbf24' : '#ff6b6b' }}>
                  {password.length >= 12 ? 'Strong password ✓' : password.length >= 8 ? 'Good password' : 'Weak — use 8+ characters'}
                </span>
              </div>
            )}

            <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>
                ✅ You'll get access to the CRM workspace<br />
                ✅ No payment needed — your admin handles billing<br />
                ✅ Your role and permissions are already set
              </p>
            </div>

            <button onClick={handleSetPassword} disabled={loading}
              style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '14px', fontWeight: 700, outline: '1px solid rgba(0,255,136,0.35)', opacity: loading ? 0.6 : 1, transition: 'all 0.2s', fontFamily: 'inherit' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(0,255,136,0.25)' }}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,255,136,0.15)'}>
              {loading ? 'Setting up your account...' : '🚀 Join Workspace'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#060d06', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
      </div>
    }>
      <InviteContent />
    </Suspense>
  )
}