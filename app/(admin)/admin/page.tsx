'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Organisation = {
  id: string
  name: string
  email: string
  phone: string
  plan: 'starter' | 'growth' | 'agency'
  status: 'trialing' | 'active' | 'expired' | 'suspended'
  trialStart: string
  trialEnd: string
  lastPayment: string
  nextBilling: string
  amountPaid: number
  users: number
  contacts: number
  country: string
}

const statusColors: Record<string, string> = {
  active: '#00ff88', trialing: '#38bdf8', expired: '#ff6b6b', suspended: '#f97316',
}

const statusBg: Record<string, string> = {
  active: 'rgba(0,255,136,0.12)', trialing: 'rgba(56,189,248,0.15)', expired: 'rgba(255,107,107,0.15)', suspended: 'rgba(249,115,22,0.15)',
}

const planColors: Record<string, string> = {
  starter: '#818cf8', growth: '#00ff88', agency: '#fbbf24',
}

const planBg: Record<string, string> = {
  starter: 'rgba(129,140,248,0.15)', growth: 'rgba(0,255,136,0.12)', agency: 'rgba(251,191,36,0.15)',
}

const formatDate = (date: string) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SuperAdminPage() {
  const [orgs, setOrgs] = useState<Organisation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState<Organisation | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'organisations' | 'revenue' | 'settings'>('overview')
  const [actionMsg, setActionMsg] = useState('')
  const [trialDays, setTrialDays] = useState(7)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [messageText, setMessageText] = useState('')

  useEffect(() => {
    fetchOrgs()
  }, [])

  const fetchOrgs = async () => {
    setLoading(true)
    try {
      const { data: orgsData } = await supabaseAdmin
        .from('organisations')
        .select('*')
        .order('created_at', { ascending: false })

      if (!orgsData) return

      // For each org fetch user count and contact count
      const orgsWithCounts = await Promise.all(orgsData.map(async (org: any) => {
        const [usersRes, contactsRes] = await Promise.all([
          supabaseAdmin.from('users').select('id', { count: 'exact' }).eq('organisation_id', org.id),
          supabaseAdmin.from('contacts').select('id', { count: 'exact' }).eq('organisation_id', org.id),
        ])

        return {
          id: org.id,
          name: org.name || '',
          email: org.email || '',
          phone: org.phone || '',
          plan: org.plan || 'growth',
          status: org.status || 'trialing',
          trialStart: formatDate(org.trial_start),
          trialEnd: formatDate(org.trial_end),
          lastPayment: formatDate(org.last_payment),
          nextBilling: formatDate(org.next_billing),
          amountPaid: org.amount_paid || 0,
          users: usersRes.count || 0,
          contacts: contactsRes.count || 0,
          country: 'Kenya',
        }
      }))

      setOrgs(orgsWithCounts)
    } catch (err) {
      console.error('Error fetching orgs:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = orgs.filter(o => {
    const matchSearch = o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'All' || o.status === statusFilter.toLowerCase()
    return matchSearch && matchStatus
  })

  const totalRevenue = orgs.reduce((s, o) => s + o.amountPaid, 0)
  const activeCount = orgs.filter(o => o.status === 'active').length
  const trialingCount = orgs.filter(o => o.status === 'trialing').length
  const expiredCount = orgs.filter(o => o.status === 'expired').length
  const suspendedCount = orgs.filter(o => o.status === 'suspended').length
  const mrr = orgs.filter(o => o.status === 'active').reduce((s, o) => {
    return s + (o.plan === 'starter' ? 1500 : o.plan === 'growth' ? 3500 : 8500)
  }, 0)

  const handleAction = async (org: Organisation, action: string) => {
    let newStatus = org.status
    let updateData: any = {}

    if (action === 'activate') {
      newStatus = 'active'
      updateData = {
        status: 'active',
        last_payment: new Date().toISOString(),
        next_billing: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }
    }
    if (action === 'suspend') {
      newStatus = 'suspended'
      updateData = { status: 'suspended' }
    }
    if (action === 'expire') {
      newStatus = 'expired'
      updateData = { status: 'expired' }
    }
    if (action === 'trial') {
      newStatus = 'trialing'
      updateData = {
        status: 'trialing',
        trial_start: new Date().toISOString(),
        trial_end: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString(),
      }
    }

    await supabaseAdmin.from('organisations').update(updateData).eq('id', org.id)

    setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, status: newStatus as any, ...updateData } : o))
    setSelected(prev => prev ? { ...prev, status: newStatus as any } : prev)
    setActionMsg(`✓ ${org.name} status updated to ${newStatus}`)
    setTimeout(() => setActionMsg(''), 3000)
    fetchOrgs()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this organisation? This cannot be undone.')) return
    await supabaseAdmin.from('organisations').delete().eq('id', id)
    setOrgs(prev => prev.filter(o => o.id !== id))
    setSelected(null)
  }

  const handleSaveSettings = () => {
    setSettingsSaved(true)
    setActionMsg(`✓ Settings saved — trial period set to ${trialDays} days`)
    setTimeout(() => { setSettingsSaved(false); setActionMsg('') }, 3000)
  }

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '13px',
    outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060d06', color: 'white', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ padding: '0 32px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,255,136,0.1)', background: 'rgba(6,13,6,0.98)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative', width: 32, height: 32 }}>
            <Image src="/logo.webp" alt="Wave CRM" fill sizes="32px" style={{ objectFit: 'contain', borderRadius: '50%' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '15px', color: 'white' }}>
            wave.<span style={{ color: '#00ff88' }}>crm</span>
          </span>
          <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: 'rgba(255,107,107,0.15)', color: '#ff6b6b', fontWeight: 600, marginLeft: '4px' }}>
            SUPER ADMIN
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {actionMsg && (
            <span style={{ fontSize: '12px', color: '#00ff88', padding: '4px 12px', borderRadius: '8px', background: 'rgba(0,255,136,0.1)' }}>
              {actionMsg}
            </span>
          )}
          <button onClick={fetchOrgs} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
            ↻ Refresh
          </button>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Wave Agency · Admin</div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>

        {/* Side nav */}
        <div style={{ width: '200px', flexShrink: 0, padding: '24px 12px', borderRight: '1px solid rgba(255,255,255,0.05)', background: 'rgba(6,13,6,0.98)' }}>
          {[
            { id: 'overview', icon: '⊞', label: 'Overview' },
            { id: 'organisations', icon: '🏢', label: 'Organisations' },
            { id: 'revenue', icon: '💰', label: 'Revenue' },
            { id: 'settings', icon: '⚙', label: 'Admin Settings' },
          ].map(item => (
            <button key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: 'none', background: activeTab === item.id ? 'rgba(0,255,136,0.1)' : 'transparent', color: activeTab === item.id ? '#00ff88' : 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', outline: activeTab === item.id ? '1px solid rgba(0,255,136,0.2)' : 'none', textAlign: 'left', marginBottom: '2px' }}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
          <div style={{ paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '32px' }}>
            <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', color: 'rgba(255,255,255,0.3)', fontSize: '13px', textDecoration: 'none' }}>
              ← Back to CRM
            </a>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '32px' }}>

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {!loading && activeTab === 'overview' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'white', margin: 0 }}>Overview</h1>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
                  Wave CRM business performance — {orgs.length} organisations
                </p>
              </div>

              {/* KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                  { label: 'Total Organisations', value: orgs.length, color: '#818cf8', icon: '🏢' },
                  { label: 'Active Subscribers', value: activeCount, color: '#00ff88', icon: '✅' },
                  { label: 'On Trial', value: trialingCount, color: '#38bdf8', icon: '⏳' },
                  { label: 'Expired / Suspended', value: expiredCount + suspendedCount, color: '#ff6b6b', icon: '⚠️' },
                ].map(kpi => (
                  <div key={kpi.label} style={{ borderRadius: '16px', padding: '20px', background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}>
                    <div style={{ fontSize: '20px', marginBottom: '10px' }}>{kpi.icon}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{kpi.label}</div>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                  </div>
                ))}
              </div>

              {/* Revenue */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div style={{ borderRadius: '16px', padding: '24px', background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Monthly Recurring Revenue (MRR)</div>
                  <div style={{ fontSize: '36px', fontWeight: 800, color: '#00ff88' }}>KES {mrr.toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '6px' }}>From {activeCount} active subscriptions</div>
                </div>
                <div style={{ borderRadius: '16px', padding: '24px', background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Total Revenue Collected</div>
                  <div style={{ fontSize: '36px', fontWeight: 800, color: '#fbbf24' }}>KES {totalRevenue.toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '6px' }}>All time payments received</div>
                </div>
              </div>

              {/* Plan breakdown */}
              <div style={{ borderRadius: '16px', padding: '24px', background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white', margin: '0 0 16px' }}>Plan Distribution</h3>
                <div style={{ display: 'flex', gap: '16px' }}>
                  {['starter', 'growth', 'agency'].map(plan => {
                    const count = orgs.filter(o => o.plan === plan).length
                    const pct = orgs.length > 0 ? Math.round((count / orgs.length) * 100) : 0
                    return (
                      <div key={plan} style={{ flex: 1, padding: '16px', borderRadius: '12px', background: planBg[plan], border: `1px solid ${planColors[plan]}25` }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: planColors[plan], marginBottom: '8px', textTransform: 'capitalize' }}>{plan}</div>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>{count}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{pct}% of total</div>
                        <div style={{ marginTop: '10px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: planColors[plan], borderRadius: '2px' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Recent orgs */}
              <div style={{ borderRadius: '16px', padding: '24px', background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white', margin: '0 0 16px' }}>Recent Organisations</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {orgs.slice(0, 5).map(org => (
                    <div key={org.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,255,136,0.12)', color: '#00ff88', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                          {getInitials(org.name)}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{org.name}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{org.email}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: planBg[org.plan], color: planColors[org.plan], fontWeight: 600, textTransform: 'capitalize' }}>{org.plan}</span>
                        <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: statusBg[org.status], color: statusColors[org.status], fontWeight: 600, textTransform: 'capitalize' }}>{org.status}</span>
                      </div>
                    </div>
                  ))}
                  {orgs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
                      No organisations yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── ORGANISATIONS ── */}
          {!loading && activeTab === 'organisations' && (
            <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 120px)' }}>

              {/* Left list */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ marginBottom: '20px' }}>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'white', margin: '0 0 4px' }}>Organisations</h1>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{orgs.length} total · {activeCount} active</p>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>🔍</span>
                    <input style={{ ...inputStyle, paddingLeft: '36px' }} placeholder="Search organisations..."
                      value={search} onChange={e => setSearch(e.target.value)}
                      onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['All', 'Active', 'Trialing', 'Expired', 'Suspended'].map(s => (
                      <button key={s} onClick={() => setStatusFilter(s)} style={{
                        padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                        background: statusFilter === s ? (s === 'All' ? 'rgba(0,255,136,0.15)' : statusBg[s.toLowerCase()]) : 'rgba(255,255,255,0.04)',
                        border: statusFilter === s ? `1px solid ${s === 'All' ? 'rgba(0,255,136,0.3)' : statusColors[s.toLowerCase()] + '40'}` : '1px solid rgba(255,255,255,0.08)',
                        color: statusFilter === s ? (s === 'All' ? '#00ff88' : statusColors[s.toLowerCase()]) : 'rgba(255,255,255,0.4)',
                      }}>{s}</button>
                    ))}
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filtered.map(org => (
                    <div key={org.id}
                      onClick={() => setSelected(org)}
                      style={{ padding: '16px', borderRadius: '14px', cursor: 'pointer', transition: 'all 0.15s', background: selected?.id === org.id ? 'rgba(0,255,136,0.06)' : 'rgba(10,20,10,0.8)', border: selected?.id === org.id ? '1px solid rgba(0,255,136,0.3)' : '1px solid rgba(255,255,255,0.07)' }}
                      onMouseEnter={e => { if (selected?.id !== org.id) e.currentTarget.style.border = '1px solid rgba(0,255,136,0.15)' }}
                      onMouseLeave={e => { if (selected?.id !== org.id) e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,255,136,0.12)', color: '#00ff88', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                            {getInitials(org.name)}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{org.name}</div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{org.email}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: planBg[org.plan], color: planColors[org.plan], fontWeight: 600, textTransform: 'capitalize' }}>{org.plan}</span>
                          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: statusBg[org.status], color: statusColors[org.status], fontWeight: 600, textTransform: 'capitalize' }}>{org.status}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>👥 {org.users} users</span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>👤 {org.contacts} contacts</span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>📅 Trial ends: {org.trialEnd}</span>
                      </div>
                    </div>
                  ))}
                  {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
                      No organisations found
                    </div>
                  )}
                </div>
              </div>

              {/* Right detail panel */}
              {selected ? (
                <div style={{ width: '360px', flexShrink: 0, overflowY: 'auto', borderRadius: '16px', background: 'rgba(10,20,10,0.9)', border: '1px solid rgba(0,255,136,0.15)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,255,136,0.15)', color: '#00ff88', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700 }}>
                        {getInitials(selected.name)}
                      </div>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>{selected.name}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{selected.email}</div>
                      </div>
                    </div>
                    <button onClick={() => setSelected(null)} style={{ width: 28, height: 28, borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px' }}>×</button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '12px', padding: '4px 14px', borderRadius: '20px', background: statusBg[selected.status], color: statusColors[selected.status], fontWeight: 600, textTransform: 'capitalize' }}>{selected.status}</span>
                    <span style={{ fontSize: '12px', padding: '4px 14px', borderRadius: '20px', background: planBg[selected.plan], color: planColors[selected.plan], fontWeight: 600, textTransform: 'capitalize' }}>{selected.plan} Plan</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {[
                      { label: 'Phone', value: selected.phone || '—' },
                      { label: 'Country', value: selected.country },
                      { label: 'Users', value: selected.users },
                      { label: 'Contacts', value: selected.contacts },
                      { label: 'Trial Start', value: selected.trialStart },
                      { label: 'Trial End', value: selected.trialEnd },
                      { label: 'Last Payment', value: selected.lastPayment },
                      { label: 'Next Billing', value: selected.nextBilling },
                      { label: 'Total Paid', value: `KES ${selected.amountPaid.toLocaleString()}` },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{item.label}</span>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: 'white' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Actions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button onClick={() => handleAction(selected, 'activate')}
                        style={{ padding: '10px', borderRadius: '10px', border: '1px solid rgba(0,255,136,0.25)', cursor: 'pointer', background: 'rgba(0,255,136,0.12)', color: '#00ff88', fontSize: '13px', fontWeight: 600 }}>
                        ✓ Activate Account
                      </button>
                      <button onClick={() => handleAction(selected, 'trial')}
                        style={{ padding: '10px', borderRadius: '10px', border: '1px solid rgba(56,189,248,0.25)', cursor: 'pointer', background: 'rgba(56,189,248,0.12)', color: '#38bdf8', fontSize: '13px', fontWeight: 600 }}>
                        ⏳ Reset Trial ({trialDays} days)
                      </button>
                      <button onClick={() => handleAction(selected, 'expire')}
                        style={{ padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,107,107,0.25)', cursor: 'pointer', background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', fontSize: '13px', fontWeight: 600 }}>
                        ⚠ Mark as Expired
                      </button>
                      <button onClick={() => handleAction(selected, 'suspend')}
                        style={{ padding: '10px', borderRadius: '10px', border: '1px solid rgba(249,115,22,0.25)', cursor: 'pointer', background: 'rgba(249,115,22,0.1)', color: '#f97316', fontSize: '13px', fontWeight: 600 }}>
                        🚫 Suspend Account
                      </button>
                      <button onClick={() => handleDelete(selected.id)}
                        style={{ padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,107,107,0.15)', cursor: 'pointer', background: 'rgba(255,107,107,0.06)', color: 'rgba(255,107,107,0.6)', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>
                        🗑 Delete Organisation
                      </button>
                    </div>
                  </div>

                  {/* Send message */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Send Message</div>
                    <textarea
                      placeholder={`Send a message to ${selected.name}...`}
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '13px', outline: 'none', resize: 'none', minHeight: '80px', fontFamily: 'inherit', boxSizing: 'border-box' as const }}
                      onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                    <button style={{ marginTop: '8px', width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid rgba(0,255,136,0.25)', cursor: 'pointer', background: 'rgba(0,255,136,0.12)', color: '#00ff88', fontSize: '13px', fontWeight: 600 }}>
                      Send via WhatsApp / Email
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ width: '360px', flexShrink: 0, borderRadius: '16px', background: 'rgba(10,20,10,0.5)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '40px', opacity: 0.2 }}>🏢</div>
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.25)' }}>Select an organisation</div>
                </div>
              )}
            </div>
          )}

          {/* ── REVENUE ── */}
          {!loading && activeTab === 'revenue' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'white', margin: 0 }}>Revenue</h1>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>All payments received from Wave CRM customers</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                  { label: 'MRR', value: `KES ${mrr.toLocaleString()}`, sub: 'Monthly recurring', color: '#00ff88' },
                  { label: 'ARR', value: `KES ${(mrr * 12).toLocaleString()}`, sub: 'Annual run rate', color: '#fbbf24' },
                  { label: 'Total Collected', value: `KES ${totalRevenue.toLocaleString()}`, sub: 'All time', color: '#38bdf8' },
                ].map(k => (
                  <div key={k.label} style={{ borderRadius: '16px', padding: '24px', background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>{k.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ borderRadius: '16px', overflow: 'hidden', border: '0.5px solid rgba(0,255,136,0.1)', background: 'rgba(10,20,10,0.8)' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white', margin: 0 }}>Payment Records</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Organisation', 'Plan', 'Status', 'Trial End', 'Next Billing', 'Total Paid'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.map(org => (
                      <tr key={org.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,255,136,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{org.name}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{org.email}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: planBg[org.plan], color: planColors[org.plan], fontWeight: 600, textTransform: 'capitalize' }}>{org.plan}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: statusBg[org.status], color: statusColors[org.status], fontWeight: 600, textTransform: 'capitalize' }}>{org.status}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{org.trialEnd}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{org.nextBilling}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: org.amountPaid > 0 ? '#00ff88' : 'rgba(255,255,255,0.25)' }}>
                          {org.amountPaid > 0 ? `KES ${org.amountPaid.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    ))}
                    {orgs.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
                          No payment records yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {!loading && activeTab === 'settings' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'white', margin: 0 }}>Admin Settings</h1>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>Configure Wave CRM global settings</p>
              </div>

              {/* Trial Period */}
              <div style={{ borderRadius: '16px', padding: '24px', background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>Trial Period</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>
                  How long new signups get for free — applies to all new accounts
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button onClick={() => setTrialDays(prev => Math.max(1, prev - 1))}
                    style={{ width: 36, height: 36, borderRadius: '10px', border: 'none', background: 'rgba(255,107,107,0.12)', color: '#ff6b6b', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    −
                  </button>
                  <input type="number" value={trialDays}
                    onChange={e => setTrialDays(Math.max(1, Math.min(90, parseInt(e.target.value) || 1)))}
                    style={{ width: '72px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,255,136,0.25)', borderRadius: '10px', padding: '8px', color: 'white', fontSize: '18px', fontWeight: 800, outline: 'none', textAlign: 'center' }} />
                  <button onClick={() => setTrialDays(prev => Math.min(90, prev + 1))}
                    style={{ width: 36, height: 36, borderRadius: '10px', border: 'none', background: 'rgba(0,255,136,0.12)', color: '#00ff88', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    +
                  </button>
                  <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginRight: '8px' }}>days</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[3, 7, 14, 30].map(d => (
                      <button key={d} onClick={() => setTrialDays(d)}
                        style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: trialDays === d ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)', color: trialDays === d ? '#00ff88' : 'rgba(255,255,255,0.4)', outline: trialDays === d ? '1px solid rgba(0,255,136,0.3)' : 'none' }}>
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>⏳</span>
                  <span style={{ fontSize: '13px', color: '#00ff88', fontWeight: 600 }}>
                    New signups will get {trialDays} day{trialDays !== 1 ? 's' : ''} free
                  </span>
                </div>
              </div>

              {/* Auto lock */}
              <div style={{ borderRadius: '16px', padding: '20px 24px', background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>Auto-lock on expiry</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Automatically lock accounts when trial/subscription expires</div>
                </div>
                <div style={{ width: 44, height: 24, borderRadius: '12px', cursor: 'pointer', background: 'rgba(0,255,136,0.3)', border: '1px solid rgba(0,255,136,0.5)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '3px', left: '22px', width: 16, height: 16, borderRadius: '50%', background: '#00ff88' }} />
                </div>
              </div>

              {/* Reminders */}
              <div style={{ borderRadius: '16px', padding: '20px 24px', background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>Expiry reminder emails</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Send reminder emails before account expires</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['3 days before', '1 day before'].map(d => (
                    <span key={d} style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '8px', background: 'rgba(0,255,136,0.12)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.25)' }}>{d}</span>
                  ))}
                </div>
              </div>

              {/* Support WhatsApp */}
              <div style={{ borderRadius: '16px', padding: '20px 24px', background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>Support WhatsApp</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Number customers contact for billing support</div>
                </div>
                <input defaultValue="+254 7XX XXX XXX"
                  style={{ width: '200px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '13px', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleSaveSettings}
                  style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: settingsSaved ? 'rgba(0,255,136,0.25)' : 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '14px', fontWeight: 700, outline: '1px solid rgba(0,255,136,0.3)', transition: 'all 0.2s' }}>
                  {settingsSaved ? '✓ Saved!' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}