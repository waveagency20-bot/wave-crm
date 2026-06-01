'use client'

import { useState } from 'react'
import Image from 'next/image'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 1500,
    period: '/mo',
    color: '#818cf8',
    bg: 'rgba(129,140,248,0.12)',
    border: 'rgba(129,140,248,0.3)',
    users: '1–2 users',
    contacts: '500 contacts',
    features: ['Contact management', 'Basic pipeline', 'WhatsApp messaging', 'Task management'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 3500,
    period: '/mo',
    color: '#00ff88',
    bg: 'rgba(0,255,136,0.12)',
    border: 'rgba(0,255,136,0.35)',
    users: 'Up to 10 users',
    contacts: '5,000 contacts',
    features: ['Everything in Starter', 'Email campaigns', 'Advanced analytics', 'Team management'],
    popular: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 8500,
    period: '/mo',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.12)',
    border: 'rgba(251,191,36,0.3)',
    users: 'Unlimited users',
    contacts: 'Unlimited contacts',
    features: ['Everything in Growth', 'White label', 'API access', 'Priority support'],
  },
]

export default function ExpiredPage() {
  const [selectedPlan, setSelectedPlan] = useState('growth')
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa')
  const [mpesaCode, setMpesaCode] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const plan = plans.find(p => p.id === selectedPlan)!

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    if (paymentMethod === 'mpesa') {
      if (!phone) newErrors.phone = 'Phone number is required'
      if (!mpesaCode) newErrors.mpesaCode = 'M-Pesa transaction code is required'
      if (mpesaCode && !/^[A-Z0-9]{10}$/.test(mpesaCode.toUpperCase())) {
        newErrors.mpesaCode = 'Enter a valid M-Pesa code e.g. QHG7YK23PL'
      }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="https://wa.me/254700000000" target="_blank" rel="noreferrer"
            style={{ fontSize: '13px', color: '#00ff88', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            💬 Need help? WhatsApp us
          </a>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', overflowY: 'auto' }}>

        {submitted ? (
          /* Success state */
          <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', paddingTop: '48px' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'white', margin: '0 0 12px' }}>
              Payment submitted!
            </h1>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: '0 0 32px' }}>
              Thank you! We've received your payment details for the <strong style={{ color: plan.color }}>{plan.name} plan</strong>.
              Our team will verify and activate your account within <strong style={{ color: 'white' }}>30 minutes</strong>.
            </p>
            <div style={{ padding: '20px 24px', borderRadius: '16px', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', marginBottom: '24px' }}>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.7 }}>
                You'll receive a WhatsApp confirmation once your account is activated.
                If you don't hear from us within 30 minutes, please WhatsApp us directly.
              </p>
            </div>
            <a href="https://wa.me/254700000000" target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '12px', background: 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '14px', fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(0,255,136,0.3)' }}>
              💬 WhatsApp us now
            </a>
          </div>
        ) : (
          <>
            {/* Expired banner */}
            <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center', marginBottom: '48px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '20px', background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.25)', marginBottom: '20px' }}>
                <span style={{ color: '#ff6b6b', fontSize: '12px', fontWeight: 600 }}>⚠ Your trial has ended</span>
              </div>
              <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'white', margin: '0 0 12px', lineHeight: 1.2 }}>
                Continue growing your business
              </h1>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: 0 }}>
                Your 7-day free trial has expired. Choose a plan below to keep access to
                your contacts, pipeline, and everything you've built.
              </p>
            </div>

            {/* Plans */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '860px', width: '100%', marginBottom: '40px' }}>
              {plans.map(p => (
                <div key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  style={{
                    borderRadius: '20px', padding: '28px 24px', cursor: 'pointer', position: 'relative',
                    background: selectedPlan === p.id ? p.bg : 'rgba(10,20,10,0.8)',
                    border: selectedPlan === p.id ? `2px solid ${p.border}` : '1px solid rgba(255,255,255,0.08)',
                    transition: 'all 0.2s', transform: selectedPlan === p.id ? 'translateY(-4px)' : 'none',
                    boxShadow: selectedPlan === p.id ? `0 12px 32px rgba(0,0,0,0.3), 0 0 0 1px ${p.border}` : 'none',
                  }}
                  onMouseEnter={e => { if (selectedPlan !== p.id) e.currentTarget.style.border = `1px solid ${p.border}` }}
                  onMouseLeave={e => { if (selectedPlan !== p.id) e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)' }}>

                  {p.popular && (
                    <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', fontWeight: 700, padding: '3px 14px', borderRadius: '20px', background: p.color, color: '#060d06', whiteSpace: 'nowrap' }}>
                      Most Popular
                    </div>
                  )}

                  {selectedPlan === p.id && (
                    <div style={{ position: 'absolute', top: '16px', right: '16px', width: 20, height: 20, borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#060d06', fontWeight: 700 }}>✓</div>
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

            {/* Payment section */}
            <div style={{ maxWidth: '480px', width: '100%' }}>
              <div style={{ borderRadius: '20px', background: 'rgba(10,20,10,0.9)', border: '1px solid rgba(0,255,136,0.15)', overflow: 'hidden' }}>

                {/* Payment header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>
                    Complete your payment
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                    {plan.name} plan · <span style={{ color: plan.color, fontWeight: 600 }}>KES {plan.price.toLocaleString()}/month</span>
                  </div>
                </div>

                <div style={{ padding: '24px' }}>

                  {/* Payment method toggle */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={labelStyle}>Payment method</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {[
                        { id: 'mpesa', icon: '📱', label: 'M-Pesa', sub: 'Safaricom' },
                        { id: 'card', icon: '💳', label: 'Card', sub: 'Visa / Mastercard' },
                      ].map(method => (
                        <button key={method.id}
                          onClick={() => setPaymentMethod(method.id as any)}
                          style={{
                            padding: '14px', borderRadius: '12px', cursor: 'pointer',
background: paymentMethod === method.id ? 'rgba(0,255,136,0.12)' : 'rgba(255,255,255,0.04)',
border: paymentMethod === method.id ? '1.5px solid rgba(0,255,136,0.35)' : '1px solid rgba(255,255,255,0.1)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                            transition: 'all 0.15s',
                          }}>
                          <span style={{ fontSize: '24px' }}>{method.icon}</span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: paymentMethod === method.id ? '#00ff88' : 'white' }}>{method.label}</span>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{method.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* M-Pesa flow */}
                  {paymentMethod === 'mpesa' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                      {/* Instructions */}
                      <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#00ff88', marginBottom: '10px' }}>
                          How to pay via M-Pesa:
                        </div>
                        {[
                          'Go to M-Pesa → Lipa na M-Pesa → Paybill',
                          'Business No: 123456',
                          `Account No: WAVE-${plan.name.toUpperCase()}`,
                          `Amount: KES ${plan.price.toLocaleString()}`,
                          'Enter your M-Pesa PIN',
                          'Copy the transaction code and paste below',
                        ].map((step, i) => (
                          <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '6px', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#00ff88', background: 'rgba(0,255,136,0.15)', width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>{i + 1}</span>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{step}</span>
                          </div>
                        ))}
                      </div>

                      {/* Phone */}
                      <div>
                        <label style={labelStyle}>Your M-Pesa phone number</label>
                        <input style={{ ...inputStyle, borderColor: errors.phone ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
                          placeholder="+254 7XX XXX XXX" value={phone}
                          onChange={e => { setPhone(e.target.value); setErrors({ ...errors, phone: '' }) }}
                          onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                          onBlur={e => e.target.style.borderColor = errors.phone ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
                        {errors.phone && <p style={{ fontSize: '11px', color: '#ff6b6b', margin: '4px 0 0' }}>⚠ {errors.phone}</p>}
                      </div>

                      {/* Transaction code */}
                      <div>
                        <label style={labelStyle}>M-Pesa transaction code</label>
                        <input style={{ ...inputStyle, borderColor: errors.mpesaCode ? '#ff6b6b' : 'rgba(255,255,255,0.1)', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                          placeholder="e.g. QHG7YK23PL" value={mpesaCode}
                          onChange={e => { setMpesaCode(e.target.value.toUpperCase()); setErrors({ ...errors, mpesaCode: '' }) }}
                          onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                          onBlur={e => e.target.style.borderColor = errors.mpesaCode ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
                        {errors.mpesaCode && <p style={{ fontSize: '11px', color: '#ff6b6b', margin: '4px 0 0' }}>⚠ {errors.mpesaCode}</p>}
                      </div>
                    </div>
                  )}

                  {/* Card flow */}
                  {paymentMethod === 'card' && (
                    <div style={{ padding: '24px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                      <div style={{ fontSize: '32px', marginBottom: '12px' }}>💳</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '6px' }}>Pay with Stripe</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '16px' }}>
                        You'll be redirected to Stripe's secure checkout to complete your payment. Supports Visa and Mastercard.
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>🔒 Secured by Stripe</span>
                      </div>
                    </div>
                  )}

                  {/* Submit */}
                  <button onClick={handleSubmit} disabled={submitting}
                    style={{
                      width: '100%', marginTop: '20px', padding: '14px', borderRadius: '12px',
                      cursor: 'pointer', fontSize: '15px', fontWeight: 700,
background: 'rgba(0,255,136,0.15)', color: '#00ff88',
border: '1px solid rgba(0,255,136,0.35)',
                      opacity: submitting ? 0.6 : 1, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = 'rgba(0,255,136,0.25)' }}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,255,136,0.15)'}>
                    {submitting ? 'Processing...' : paymentMethod === 'mpesa' ? `✓ Submit M-Pesa Payment` : '→ Continue to Stripe'}
                  </button>

                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: '12px', lineHeight: 1.6 }}>
                    M-Pesa payments are verified manually within 30 minutes.
                    Your data is safe and will not be deleted.
                  </p>
                </div>
              </div>

              {/* Help */}
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                  Having trouble? &nbsp;
                  <a href="https://wa.me/254700000000" target="_blank" rel="noreferrer"
                    style={{ color: '#00ff88', textDecoration: 'none', fontWeight: 500 }}>
                    WhatsApp us
                  </a>
                  &nbsp; and we'll sort it out immediately.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}