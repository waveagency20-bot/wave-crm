'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError

      const { data: userProfile } = await supabase
        .from('users').select('*, organisations(*)')
        .eq('auth_id', data.user.id).single()

      const orgStatus = userProfile?.organisations?.status

      if (orgStatus === 'expired')   { router.push('/expired');   return }
      if (orgStatus === 'suspended') { router.push('/suspended'); return }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.')
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#080f08' }}>

      {/* ── Left panel — desktop only ── */}
      <div className="hidden lg:flex flex-col justify-center px-16 w-1/2 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #00ff88, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(#00ff88 1px, transparent 1px), linear-gradient(90deg, #00ff88 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

        <div className="flex items-center gap-3 mb-16 relative z-10">
          <div className="relative w-14 h-14">
            <Image src="/logo.webp" alt="Wave CRM" fill sizes="56px" className="object-contain rounded-full" />
          </div>
          <span className="text-white font-bold text-2xl tracking-wide">
            wave.<span style={{ color: '#00ff88' }}>crm</span>
          </span>
        </div>

        <h1 className="text-5xl font-extrabold text-white leading-tight mb-6 tracking-tight relative z-10">
          Manage leads.<br />
          <span style={{ color: '#00ff88' }}>Close deals.</span><br />
          Grow faster.
        </h1>
        <p className="text-white/50 text-base leading-relaxed max-w-sm mb-12 relative z-10">
          The CRM built for African businesses — from solo founders to agencies. WhatsApp-first and designed for how you actually work.
        </p>

        <div className="flex gap-10 relative z-10">
          {[
            { num: '50+', label: 'Active businesses' },
            { num: '3×',  label: 'Avg lead growth' },
            { num: '4.9★', label: 'Customer rating' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-3xl font-bold" style={{ color: '#00ff88' }}>{s.num}</div>
              <div className="text-white/40 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — full width on mobile ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Less padding on mobile so card fits on screen
        padding: '16px',
        overflowY: 'auto',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '440px',
          borderRadius: '20px',
          // Less inner padding on mobile
          padding: 'clamp(20px, 5vw, 40px)',
          backdropFilter: 'blur(20px)',
          background: 'rgba(10,20,10,0.85)',
          border: '0.5px solid rgba(0,255,136,0.15)',
          // Allow card to shrink on very small screens
          boxSizing: 'border-box',
        }}>

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-6">
            <div className="relative w-9 h-9">
              <Image src="/logo.webp" alt="Wave CRM" fill sizes="36px" className="object-contain rounded-full" />
            </div>
            <span className="text-white font-bold text-base">
              wave.<span style={{ color: '#00ff88' }}>crm</span>
            </span>
          </div>

          <h2 style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 700, color: 'white', margin: '0 0 4px' }}>
            Welcome back
          </h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '0 0 24px' }}>
            Sign in to your Wave CRM workspace
          </p>

          {/* Error */}
          {error && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#ff6b6b', margin: 0 }}>⚠ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Email */}
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: '6px' }}>
                Email address
              </label>
              <input
                type="email" placeholder="you@company.com"
                value={email} onChange={e => { setEmail(e.target.value); setError('') }}
                required
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 16px', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={e => { setPassword(e.target.value); setError('') }}
                  required
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 56px 12px 16px', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 600, color: 'rgba(0,255,136,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px' }}>
              <button type="button"
                onClick={async () => {
                  if (!email) { setError('Enter your email first'); return }
                  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
                  alert('Password reset email sent! Check your inbox.')
                }}
                style={{ fontSize: '12px', color: '#00ff88', opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer' }}>
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              style={{ width: '100%', padding: '13px', borderRadius: '12px', fontWeight: 600, fontSize: '14px', background: loading ? 'rgba(0,255,136,0.1)' : 'rgba(0,255,136,0.15)', border: '0.5px solid rgba(0,255,136,0.4)', color: '#00ff88', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(0,255,136,0.25)' }}
              onMouseLeave={e => { e.currentTarget.style.background = loading ? 'rgba(0,255,136,0.1)' : 'rgba(0,255,136,0.15)' }}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, color: 'white', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'border 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,255,136,0.3)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Footer links */}
          <p style={{ textAlign: 'center', fontSize: '13px', marginTop: '20px', color: 'rgba(255,255,255,0.25)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: '#00ff88', textDecoration: 'none', fontWeight: 500 }}>
              Sign up free
            </Link>
          </p>
          <p style={{ textAlign: 'center', fontSize: '11px', marginTop: '12px', color: 'rgba(255,255,255,0.2)' }}>
            <a href="/privacy-policy" target="_blank" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Privacy Policy</a>
            {' · '}
            <a href="/terms-of-service" target="_blank" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Terms of Service</a>
          </p>
        </div>
      </div>
    </div>
  )
}