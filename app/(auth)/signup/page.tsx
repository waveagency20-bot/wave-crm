'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
const validatePhone = (phone: string) => {
  if (!phone) return true
  const cleaned = phone.replace(/[\s\-()]/g, '')
  return /^(\+254|0)[17]\d{8}$/.test(cleaned)
}

const plans = [
  { id: 'starter',    name: 'Starter',    price: 'KES 3,500/mo', color: '#818cf8', desc: '1-3 users · 500 contacts · 500 SMS/month',              popular: false },
  { id: 'growth',     name: 'Growth',     price: 'KES 8,500/mo', color: '#00ff88', desc: 'Up to 10 users · 5,000 contacts · 2,000 SMS/month',      popular: true  },
  { id: 'enterprise', name: 'Enterprise', price: 'KES 16,500/mo',color: '#fbbf24', desc: 'Unlimited users & contacts · 5,000 SMS/month',           popular: false },
]

const industries = [
  'Marketing & Advertising','Technology','Retail & E-commerce','Real Estate',
  'Education','Healthcare','Finance','Agriculture','Hospitality','Other',
]

const benefits = [
  'Unlimited contacts during trial',
  'WhatsApp, Email & SMS messaging',
  'Full pipeline & task management',
  'Team collaboration tools',
  'Campaigns & analytics',
]

export default function SignupPage() {
  const [step,       setStep]       = useState<1 | 2>(1)
  const [form,       setForm]       = useState({
    companyName: '', industry: '', website: '',
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    plan: 'growth', agreeTerms: false,
  })
  const [errors,     setErrors]     = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState(false)
  const [isMobile,   setIsMobile]   = useState(false)
  const router = useRouter()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const validateStep1 = () => {
    const e: Record<string, string> = {}
    if (!form.companyName) e.companyName = 'Company name is required'
    if (!form.industry)    e.industry    = 'Please select your industry'
    if (Object.keys(e).length) { setErrors(e); return false }
    setErrors({}); return true
  }

  const validateStep2 = () => {
    const e: Record<string, string> = {}
    if (!form.name)           e.name            = 'Your name is required'
    if (!form.email)          e.email           = 'Email is required'
    if (form.email && !validateEmail(form.email)) e.email = 'Enter a valid email address'
    if (form.phone && !validatePhone(form.phone)) e.phone = 'Enter a valid Kenyan number e.g. 0712345678'
    if (!form.password)       e.password        = 'Password is required'
    if (form.password && form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password'
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword)
      e.confirmPassword = 'Passwords do not match'
    if (!form.agreeTerms) e.agreeTerms = 'You must agree to the terms'
    if (Object.keys(e).length) { setErrors(e); return false }
    setErrors({}); return true
  }

  const handleNext    = () => { if (validateStep1()) setStep(2) }

  const handleSubmit = async () => {
    if (!validateStep2()) return
    setSubmitting(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: form.email, password: form.password })
      if (authError) throw authError

      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .insert({ name: form.companyName, email: form.email, industry: form.industry, website: form.website, plan: form.plan, status: 'trialing', trial_start: new Date().toISOString(), trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
        .select().single()
      if (orgError) throw orgError

      const { error: userError } = await supabase
        .from('users')
        .insert({ auth_id: authData.user?.id, organisation_id: orgData.id, name: form.name, email: form.email, phone: form.phone, role: 'admin', status: 'active' })
      if (userError) throw userError

      fetch('/api/email/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, firstName: form.name.split(' ')[0], confirmUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard` }),
      })

      setSubmitting(false)
      setDone(true)
    } catch (error: any) {
      setSubmitting(false)
      alert(error.message || 'Something went wrong. Please try again.')
    }
  }

  const inp = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
    padding: '11px 14px', color: 'white', fontSize: '13px',
    outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit',
  }

  const lbl = {
    fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
    display: 'block', marginBottom: '6px',
  }

  const err = (key: string) => errors[key]
    ? <p style={{ fontSize: '11px', color: '#ff6b6b', margin: '4px 0 0' }}>⚠ {errors[key]}</p>
    : null

  const strength = form.password.length >= 12 ? 4 : form.password.length >= 10 ? 3 : form.password.length >= 8 ? 2 : form.password.length > 0 ? 1 : 0

  return (
    <div style={{ minHeight: '100vh', background: '#060d06', color: 'white', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>

      {/* ── Left panel — hidden on mobile ── */}
      {!isMobile && (
        <div style={{ width: '400px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,136,0.08), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'linear-gradient(#00ff88 1px, transparent 1px), linear-gradient(90deg, #00ff88 1px, transparent 1px)', backgroundSize: '50px 50px', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px', position: 'relative' }}>
            <div style={{ position: 'relative', width: 40, height: 40 }}>
              <Image src="/logo.webp" alt="Wave CRM" fill sizes="40px" style={{ objectFit: 'contain', borderRadius: '50%' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '22px', color: 'white' }}>
              wave.<span style={{ color: '#00ff88' }}>crm</span>
            </span>
          </div>

          <h1 style={{ fontSize: '34px', fontWeight: 800, color: 'white', lineHeight: 1.15, margin: '0 0 14px', position: 'relative' }}>
            Start your<br /><span style={{ color: '#00ff88' }}>7-day</span><br />free trial
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: '0 0 36px', position: 'relative' }}>
            No credit card required. Full access to all features for 7 days.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
            {benefits.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,255,136,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={10} color='#00ff88' />
                </div>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Right panel ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '0' : '24px',
        overflowY: 'auto',
      }}>
        <div style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : '480px',
          // On mobile: no border-radius, fills screen edge to edge
          borderRadius: isMobile ? '0' : '20px',
          background: 'rgba(10,20,10,0.9)',
          border: isMobile ? 'none' : '1px solid rgba(0,255,136,0.12)',
          minHeight: isMobile ? '100vh' : 'auto',
          overflow: 'hidden',
        }}>

          {done ? (
            <div style={{ textAlign: 'center', padding: '60px 32px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,255,136,0.15)', border: '2px solid rgba(0,255,136,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Check size={28} color='#00ff88' />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'white', margin: '0 0 10px' }}>Account created!</h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: '0 0 28px' }}>
                Welcome to Wave CRM! Your 7-day free trial starts now. Check your email for a confirmation link.
              </p>
              <Link href="/dashboard" style={{ display: 'inline-block', padding: '13px 32px', borderRadius: '12px', background: 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '14px', fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(0,255,136,0.35)' }}>
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <>
              {/* Progress bar */}
              <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ height: '100%', width: step === 1 ? '50%' : '100%', background: '#00ff88', transition: 'width 0.4s ease' }} />
              </div>

              {/* Mobile top bar with logo */}
              {isMobile && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid rgba(0,255,136,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ position: 'relative', width: 32, height: 32 }}>
                      <Image src="/logo.webp" alt="Wave CRM" fill sizes="32px" style={{ objectFit: 'contain', borderRadius: '50%' }} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '16px', color: 'white' }}>
                      wave.<span style={{ color: '#00ff88' }}>crm</span>
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Step {step} of 2</span>
                </div>
              )}

              <div style={{ padding: isMobile ? '24px 20px' : '28px 32px' }}>

                {/* Header */}
                {!isMobile && (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Step {step} of 2</span>
                      <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{step === 1 ? 'Company details' : 'Your account'}</span>
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', margin: 0 }}>
                      {step === 1 ? 'Tell us about your business' : 'Create your account'}
                    </h2>
                  </div>
                )}

                {isMobile && (
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', margin: '0 0 20px' }}>
                    {step === 1 ? 'About your business' : 'Create your account'}
                  </h2>
                )}

                {/* ── STEP 1 ── */}
                {step === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    <div>
                      <label style={lbl}>Company Name *</label>
                      <input style={{ ...inp, borderColor: errors.companyName ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
                        placeholder="e.g. Kamau Enterprises" value={form.companyName}
                        onChange={e => { setForm({ ...form, companyName: e.target.value }); setErrors({ ...errors, companyName: '' }) }}
                        onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                        onBlur={e => e.target.style.borderColor = errors.companyName ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
                      {err('companyName')}
                    </div>

                    <div>
                      <label style={lbl}>Industry *</label>
                      <select style={{ ...inp, cursor: 'pointer', borderColor: errors.industry ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
                        value={form.industry}
                        onChange={e => { setForm({ ...form, industry: e.target.value }); setErrors({ ...errors, industry: '' }) }}
                        onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                        onBlur={e => e.target.style.borderColor = errors.industry ? '#ff6b6b' : 'rgba(255,255,255,0.1)'}>
                        <option value="" style={{ background: '#0a140a' }}>Select your industry</option>
                        {industries.map(ind => <option key={ind} value={ind} style={{ background: '#0a140a' }}>{ind}</option>)}
                      </select>
                      {err('industry')}
                    </div>

                    <div>
                      <label style={lbl}>Website <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
                      <input style={inp} placeholder="https://yourcompany.co.ke" value={form.website}
                        onChange={e => setForm({ ...form, website: e.target.value })}
                        onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                    </div>

                    {/* Plan selector */}
                    <div>
                      <label style={lbl}>Plan <span style={{ textTransform: 'none', fontWeight: 400 }}>(free for 7 days)</span></label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {plans.map(p => (
                          <div key={p.id} onClick={() => setForm({ ...form, plan: p.id })}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderRadius: '12px', cursor: 'pointer', background: form.plan === p.id ? `${p.color}10` : 'rgba(255,255,255,0.03)', border: form.plan === p.id ? `1.5px solid ${p.color}50` : '1px solid rgba(255,255,255,0.08)', transition: 'all 0.15s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${form.plan === p.id ? p.color : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {form.plan === p.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />}
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: form.plan === p.id ? p.color : 'white' }}>{p.name}</span>
                                  {p.popular && <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: `${p.color}20`, color: p.color, fontWeight: 600 }}>Popular</span>}
                                </div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>{p.desc}</div>
                              </div>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: form.plan === p.id ? p.color : 'rgba(255,255,255,0.4)', flexShrink: 0, marginLeft: '8px' }}>{p.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button onClick={handleNext}
                      style={{ width: '100%', padding: '13px', borderRadius: '12px', background: 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '14px', fontWeight: 600, border: '1px solid rgba(0,255,136,0.35)', cursor: 'pointer', marginTop: '4px' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,255,136,0.25)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,255,136,0.15)'}>
                      Continue →
                    </button>
                  </div>
                )}

                {/* ── STEP 2 ── */}
                {step === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* Name + Phone — stacked on mobile */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={lbl}>Full Name *</label>
                        <input style={{ ...inp, borderColor: errors.name ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
                          placeholder="John Kariuki" value={form.name}
                          onChange={e => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: '' }) }}
                          onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                          onBlur={e => e.target.style.borderColor = errors.name ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
                        {err('name')}
                      </div>
                      <div>
                        <label style={lbl}>Phone</label>
                        <input style={{ ...inp, borderColor: errors.phone ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
                          placeholder="0712345678" value={form.phone}
                          onChange={e => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: '' }) }}
                          onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                          onBlur={e => e.target.style.borderColor = errors.phone ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
                        {err('phone')}
                      </div>
                    </div>

                    <div>
                      <label style={lbl}>Work Email *</label>
                      <input style={{ ...inp, borderColor: errors.email ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
                        placeholder="john@company.co.ke" type="email" value={form.email}
                        onChange={e => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: '' }) }}
                        onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                        onBlur={e => e.target.style.borderColor = errors.email ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
                      {err('email')}
                    </div>

                    {/* Password + Confirm — stacked on mobile */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={lbl}>Password *</label>
                        <input style={{ ...inp, borderColor: errors.password ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
                          type="password" placeholder="Min 8 characters" value={form.password}
                          onChange={e => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: '' }) }}
                          onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                          onBlur={e => e.target.style.borderColor = errors.password ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
                        {err('password')}
                      </div>
                      <div>
                        <label style={lbl}>Confirm Password *</label>
                        <input style={{ ...inp, borderColor: errors.confirmPassword ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
                          type="password" placeholder="Repeat password" value={form.confirmPassword}
                          onChange={e => { setForm({ ...form, confirmPassword: e.target.value }); setErrors({ ...errors, confirmPassword: '' }) }}
                          onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                          onBlur={e => e.target.style.borderColor = errors.confirmPassword ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
                        {err('confirmPassword')}
                      </div>
                    </div>

                    {/* Password strength */}
                    {form.password && (
                      <div>
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                          {[1,2,3,4].map(i => (
                            <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= strength ? (strength >= 3 ? '#00ff88' : strength === 2 ? '#fbbf24' : '#ff6b6b') : 'rgba(255,255,255,0.1)' }} />
                          ))}
                        </div>
                        <span style={{ fontSize: '11px', color: strength >= 3 ? '#00ff88' : strength === 2 ? '#fbbf24' : '#ff6b6b' }}>
                          {strength >= 4 ? 'Strong password' : strength >= 2 ? 'Good password' : 'Weak password'}
                        </span>
                      </div>
                    )}

                    {/* Terms */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}
                        onClick={() => { setForm({ ...form, agreeTerms: !form.agreeTerms }); setErrors({ ...errors, agreeTerms: '' }) }}>
                        <div style={{ width: 18, height: 18, borderRadius: '5px', border: `2px solid ${form.agreeTerms ? '#00ff88' : errors.agreeTerms ? '#ff6b6b' : 'rgba(255,255,255,0.2)'}`, background: form.agreeTerms ? 'rgba(0,255,136,0.2)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px', transition: 'all 0.15s' }}>
                          {form.agreeTerms && <Check size={11} color='#00ff88' />}
                        </div>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                          I agree to the{' '}
                          <a href="/terms-of-service" target="_blank" style={{ color: '#00ff88', textDecoration: 'none' }}>Terms of Service</a>
                          {' '}and{' '}
                          <a href="/privacy-policy" target="_blank" style={{ color: '#00ff88', textDecoration: 'none' }}>Privacy Policy</a>
                        </span>
                      </div>
                      {err('agreeTerms')}
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <button onClick={() => { setStep(1); setErrors({}) }}
                        style={{ flex: 1, padding: '13px', borderRadius: '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)' }}>
                        Back
                      </button>
                      <button onClick={handleSubmit} disabled={submitting}
                        style={{ flex: 2, padding: '13px', borderRadius: '12px', cursor: 'pointer', background: 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '14px', fontWeight: 700, border: '1px solid rgba(0,255,136,0.35)', opacity: submitting ? 0.6 : 1, transition: 'all 0.2s' }}
                        onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = 'rgba(0,255,136,0.25)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.15)' }}>
                        {submitting ? 'Creating account...' : 'Start Free Trial'}
                      </button>
                    </div>

                    <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: '8px 0 0' }}>
                      Already have an account?{' '}
                      <Link href="/login" style={{ color: '#00ff88', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}