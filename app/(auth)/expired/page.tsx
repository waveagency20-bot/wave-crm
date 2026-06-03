'use client'

import { useState } from 'react'
import Image from 'next/image'

// ---------------------------------------------------------------------------
// Plan definitions — updated pricing
// ---------------------------------------------------------------------------
const plans = [
  {
    id:       'starter',
    name:     'Starter',
    price:    3500,
    period:   '/mo',
    color:    '#818cf8',
    bg:       'rgba(129,140,248,0.12)',
    border:   'rgba(129,140,248,0.3)',
    users:    '1-3 users',
    contacts: '500 contacts',
    sms:      '500 SMS/month',
    features: ['Contact management', 'Basic pipeline', 'WhatsApp messaging', 'Task management', '500 SMS/month'],
  },
  {
    id:       'growth',
    name:     'Growth',
    price:    8500,
    period:   '/mo',
    color:    '#00ff88',
    bg:       'rgba(0,255,136,0.12)',
    border:   'rgba(0,255,136,0.35)',
    users:    'Up to 10 users',
    contacts: '5,000 contacts',
    sms:      '2,000 SMS/month',
    features: ['Everything in Starter', 'Email campaigns', 'Advanced analytics', 'Team management', '2,000 SMS/month'],
    popular:  true,
  },
  {
    id:       'enterprise',
    name:     'Enterprise',
    price:    16500,
    period:   '/mo',
    color:    '#fbbf24',
    bg:       'rgba(251,191,36,0.12)',
    border:   'rgba(251,191,36,0.3)',
    users:    'Unlimited users',
    contacts: 'Unlimited contacts',
    sms:      '5,000 SMS/month',
    features: ['Everything in Growth', 'Custom Sender ID', 'Dedicated account manager', 'Custom onboarding', '5,000 SMS/month'],
  },
]

export default function ExpiredPage() {
  const [selectedPlan, setSelectedPlan] = useState('growth')
  const [phone, setPhone]               = useState('')
  const [mpesaCode, setMpesaCode]       = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [submitted, setSubmitted]       = useState(false)
  const [errors, setErrors]             = useState<Record<string, string>>({})

  const plan = plans.find(p => p.id === selectedPlan)!

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    if (!phone) newErrors.phone = 'Phone number is required'
    if (!mpesaCode) newErrors.mpesaCode = 'M-Pesa transaction code is required'
    if (mpesaCode && !/^[A-Z0-9]{10}$/.test(mpesaCode.toUpperCase())) {
      newErrors.mpesaCode = 'Enter a valid M-Pesa code e.g. QHG7YK23PL'
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
    }, 1500)
  }

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
    padding: '11px 14px', color: 'white', fontSize: '13px',
    outline: 'none', boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  }

  const labelStyle = {
    fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
    display: 'block', marginBottom: '6px',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#060d06', color: 'white',
      fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column',
    }}>

      {/* Top bar */}
      <div style={{
        padding: '0 32px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(0,255,136,0.08)', background: 'rgba(6,13,6,0.98)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative', width: 32, height: 32 }}>
            <Image src="/logo.webp" alt="Wave CRM" fill sizes="32px" style={{ objectFit: 'contain', borderRadius: '50%' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '15px', color: 'white' }}>
            wave.<span style={{ color: '#00ff88' }}>crm</span>
          </span>
        </div>
        <a href="https://wa.me/254700000000" target="_blank" rel="noreferrer"
          style={{ fontSize: '13px', color: '#00ff88', textDecoration: 'none' }}>
          Need help? WhatsApp us
        </a>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', overflowY: 'auto' }}>

        {submitted ? (
          // ── Success state ──
          <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', paddingTop: '48px' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'white', margin: '0 0 12px' }}>
              Payment submitted!
            </h1>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: '0 0 32px' }}>
              Thank you! We have received your payment details for the{' '}
              <strong style={{ color: plan.color }}>{plan.name} plan</strong>.
              Our team will verify and activate your account within{' '}
              <strong style={{ color: 'white' }}>30 minutes</strong>.
            </p>
            <div style={{ padding: '20px 24px', borderRadius: '16px', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', marginBottom: '24px' }}>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.7 }}>
                You will receive a WhatsApp confirmation once your account is activated.
                If you do not hear from us within 30 minutes, please WhatsApp us directly.
              </p>
            </div>
            <a href="https://wa.me/254700000000" target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '12px', background: 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '14px', fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(0,255,136,0.3)' }}>
              WhatsApp us now
            </a>
          </div>
        ) : (
          <>
            {/* Expired banner */}
            <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center', marginBottom: '48px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '20px', background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.25)', marginBottom: '20px' }}>
                <span style={{ color: '#ff6b6b', fontSize: '12px', fontWeight: 600 }}>Your trial has ended</span>
              </div>
              <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'white', margin: '0 0 12px', lineHeight: 1.2 }}>
                Continue growing your business
              </h1>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: 0 }}>
                Your 7-day free trial has expired. Choose a plan below to keep access to
                your contacts, pipeline, and everything you have built.
              </p>
            </div>

            {/* Plan cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '860px', width: '100%', marginBottom: '40px' }}>
              {plans.map(p => (
                <div key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  style={{
                    borderRadius: '20px', padding: '28px 24px', cursor: 'pointer', position: 'relative',
                    background: selectedPlan === p.id ? p.bg : 'rgba(10,20,10,0.8)',
                    border: selectedPlan === p.id ? `2px solid ${p.border}` : '1px solid rgba(255,255,255,0.08)',
                    transition: 'all 0.2s', transform: selectedPlan === p.id ? 'translateY(-4px)' : 'none',
                    boxShadow: selectedPlan === p.id ? `0 12px 32px rgba(0,0,0,0.3)` : 'none',
                  }}
                  onMouseEnter={e => { if (selectedPlan !== p.id) e.currentTarget.style.border = `1px solid ${p.border}` }}
                  onMouseLeave={e => { if (selectedPlan !== p.id) e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)' }}>

                  {p.popular && (
                    <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', fontWeight: 700, padding: '3px 14px', borderRadius: '20px', background: p.color, color: '#060d06', whiteSpace: 'nowrap' as const }}>
                      Most Popular
                    </div>
                  )}

                  {selectedPlan === p.id && (
                    <div style={{ position: 'absolute', top: '16px', right: '16px', width: 20, height: 20, borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#060d06', fontWeight: 700 }}>
                      ✓
                    </div>
                  )}

                  <div style={{ fontSize: '16px', fontWeight: 700, color: p.color, marginBottom: '12px' }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '30px', fontWeight: 800, color: 'white' }}>KES {p.price.toLocaleString()}</span>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{p.period}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>
                    {p.users} · {p.contacts}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {p.features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: p.color, fontSize: '12px' }}>✓</span>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Payment section — M-Pesa only */}
            <div style={{ maxWidth: '480px', width: '100%' }}>
              <div style={{ borderRadius: '20px', background: 'rgba(10,20,10,0.9)', border: '1px solid rgba(0,255,136,0.15)', overflow: 'hidden' }}>

                {/* Payment header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>
                    Pay via M-Pesa
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                    {plan.name} plan · <span style={{ color: plan.color, fontWeight: 600 }}>KES {plan.price.toLocaleString()}/month</span>
                  </div>
                </div>

                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* M-Pesa instructions */}
                  <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#00ff88', marginBottom: '10px' }}>
                      How to pay via M-Pesa
                    </div>
                    {[
                      'Go to M-Pesa → Lipa na M-Pesa → Paybill',
                      'Business No: 123456',
                      `Account No: WAVE-${plan.name.toUpperCase()}`,
                      `Amount: KES ${plan.price.toLocaleString()}`,
                      'Enter your M-Pesa PIN and confirm',
                      'Copy the transaction code and paste below',
                    ].map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '6px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#00ff88', background: 'rgba(0,255,136,0.15)', width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{step}</span>
                      </div>
                    ))}
                  </div>

                  {/* Phone number */}
                  <div>
                    <label style={labelStyle}>Your M-Pesa phone number</label>
                    <input
                      style={{ ...inputStyle, borderColor: errors.phone ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
                      placeholder="+254 7XX XXX XXX"
                      value={phone}
                      onChange={e => { setPhone(e.target.value); setErrors({ ...errors, phone: '' }) }}
                      onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                      onBlur={e => e.target.style.borderColor = errors.phone ? '#ff6b6b' : 'rgba(255,255,255,0.1)'}
                    />
                    {errors.phone && <p style={{ fontSize: '11px', color: '#ff6b6b', margin: '4px 0 0' }}>⚠ {errors.phone}</p>}
                  </div>

                  {/* Transaction code */}
                  <div>
                    <label style={labelStyle}>M-Pesa transaction code</label>
                    <input
                      style={{ ...inputStyle, borderColor: errors.mpesaCode ? '#ff6b6b' : 'rgba(255,255,255,0.1)', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                      placeholder="e.g. QHG7YK23PL"
                      value={mpesaCode}
                      onChange={e => { setMpesaCode(e.target.value.toUpperCase()); setErrors({ ...errors, mpesaCode: '' }) }}
                      onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                      onBlur={e => e.target.style.borderColor = errors.mpesaCode ? '#ff6b6b' : 'rgba(255,255,255,0.1)'}
                    />
                    {errors.mpesaCode && <p style={{ fontSize: '11px', color: '#ff6b6b', margin: '4px 0 0' }}>⚠ {errors.mpesaCode}</p>}
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleSubmit} disabled={submitting}
                    style={{
                      width: '100%', padding: '14px', borderRadius: '12px',
                      cursor: 'pointer', fontSize: '15px', fontWeight: 700,
                      background: 'rgba(0,255,136,0.15)', color: '#00ff88',
                      border: '1px solid rgba(0,255,136,0.35)',
                      opacity: submitting ? 0.6 : 1, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = 'rgba(0,255,136,0.25)' }}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,255,136,0.15)'}
                  >
                    {submitting ? 'Processing...' : 'Submit M-Pesa Payment'}
                  </button>

                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
                    Payments are verified manually within 30 minutes. Your data is safe and will not be deleted.
                  </p>
                </div>
              </div>

              {/* Help link */}
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                  Having trouble?{' '}
                  <a href="https://wa.me/254700000000" target="_blank" rel="noreferrer"
                    style={{ color: '#00ff88', textDecoration: 'none', fontWeight: 500 }}>
                    WhatsApp us
                  </a>{' '}
                  and we will sort it out immediately.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}