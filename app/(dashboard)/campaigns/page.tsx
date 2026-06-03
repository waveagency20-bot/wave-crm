'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/sidebar'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Campaign = {
  id: string
  name: string
  channel: 'Email' | 'WhatsApp' | 'SMS'
  status: 'Draft' | 'Scheduled' | 'Sent' | 'Active'
  audience: number
  sent: number
  opened: number
  clicked: number
  createdAt: string
  scheduledFor?: string
  message: string
  subject?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const channelColors: Record<string, string> = {
  Email: '#38bdf8', WhatsApp: '#00ff88', SMS: '#fbbf24',
}

const channelBg: Record<string, string> = {
  Email: 'rgba(56,189,248,0.15)', WhatsApp: 'rgba(0,255,136,0.12)', SMS: 'rgba(251,191,36,0.15)',
}

const channelIcons: Record<string, string> = {
  Email: '📧', WhatsApp: '💬', SMS: '📱',
}

const statusColors: Record<string, string> = {
  Draft: 'rgba(255,255,255,0.3)', Scheduled: '#fbbf24', Sent: '#00ff88', Active: '#38bdf8',
}

const statusBg: Record<string, string> = {
  Draft: 'rgba(255,255,255,0.06)', Scheduled: 'rgba(251,191,36,0.15)', Sent: 'rgba(0,255,136,0.12)', Active: 'rgba(56,189,248,0.15)',
}

const emptyForm = {
  name: '', channel: 'Email' as 'Email' | 'WhatsApp' | 'SMS',
  subject: '', message: '', scheduledFor: '', sendNow: true,
  audience: 'All Contacts',
}

const timeAgo = (date: string) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60)    return 'Just now'
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function CampaignsPage() {
  const [campaigns,     setCampaigns]     = useState<Campaign[]>([])
  const [loading,       setLoading]       = useState(true)
  const [orgId,         setOrgId]         = useState<string>('')
  const [filter,        setFilter]        = useState('All')
  const [channelFilter, setChannelFilter] = useState('All')
  const [drawerOpen,    setDrawerOpen]    = useState(false)
  const [form,          setForm]          = useState(emptyForm)
  const [errors,        setErrors]        = useState<Record<string, string>>({})
  const [submitting,    setSubmitting]    = useState(false)
  const [previewOpen,   setPreviewOpen]   = useState<Campaign | null>(null)
  const [isMobile,      setIsMobile]      = useState(false)

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { fetchCampaigns() }, [])

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userProfile } = await supabase
        .from('users').select('organisation_id').eq('auth_id', user.id).single()

      if (!userProfile) return
      setOrgId(userProfile.organisation_id)

      const { data, error } = await supabase
        .from('campaigns').select('*')
        .eq('organisation_id', userProfile.organisation_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setCampaigns(data.map((c: any) => ({
        id:           c.id,
        name:         c.name,
        channel:      c.channel === 'email' ? 'Email' : c.channel === 'whatsapp' ? 'WhatsApp' : 'SMS',
        status:       c.status === 'draft' ? 'Draft' : c.status === 'scheduled' ? 'Scheduled' : c.status === 'sent' ? 'Sent' : 'Active',
        audience:     c.audience || 0,
        sent:         c.sent     || 0,
        opened:       c.opened   || 0,
        clicked:      c.clicked  || 0,
        createdAt:    timeAgo(c.created_at),
        scheduledFor: c.scheduled_for,
        message:      c.message  || '',
        subject:      c.subject,
      })))
    } catch (err) {
      console.error('Error fetching campaigns:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = campaigns.filter(c => {
    const matchStatus  = filter        === 'All' || c.status  === filter
    const matchChannel = channelFilter === 'All' || c.channel === channelFilter
    return matchStatus && matchChannel
  })

  const totalSent    = campaigns.reduce((s, c) => s + c.sent, 0)
  const totalOpened  = campaigns.reduce((s, c) => s + c.opened, 0)
  const avgOpenRate  = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}
    if (!form.name)    newErrors.name    = 'Campaign name is required'
    if (!form.message) newErrors.message = 'Message is required'
    if (form.channel === 'Email' && !form.subject) newErrors.subject = 'Subject line is required for email'
    if (!form.sendNow && !form.scheduledFor) newErrors.scheduledFor = 'Please enter a scheduled date/time'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          organisation_id: orgId,
          name:            form.name,
          channel:         form.channel.toLowerCase(),
          status:          form.sendNow ? 'sent' : 'scheduled',
          subject:         form.subject || null,
          message:         form.message,
          audience:        form.audience,
          scheduled_for:   form.sendNow ? null : form.scheduledFor,
          sent: 0, opened: 0, clicked: 0,
        })
        .select().single()

      if (error) throw error

      setCampaigns(prev => [{
        id:           data.id,
        name:         data.name,
        channel:      data.channel === 'email' ? 'Email' : data.channel === 'whatsapp' ? 'WhatsApp' : 'SMS',
        status:       data.status === 'sent' ? 'Sent' : 'Scheduled',
        audience: 0, sent: 0, opened: 0, clicked: 0,
        createdAt:    'Just now',
        scheduledFor: data.scheduled_for,
        message:      data.message || '',
        subject:      data.subject,
      }, ...prev])

      setForm(emptyForm)
      setErrors({})
      setSubmitting(false)
      setDrawerOpen(false)
    } catch (err: any) {
      alert(err.message || 'Failed to save campaign')
      setSubmitting(false)
    }
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm('Delete this campaign?')) return
    setCampaigns(prev => prev.filter(c => c.id !== id))
    await supabase.from('campaigns').delete().eq('id', id)
  }

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
    padding: '10px 14px', color: 'white', fontSize: '13px',
    outline: 'none', boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
    display: 'block', marginBottom: '6px',
  }

  const errorText = (key: string) => errors[key]
    ? <p style={{ fontSize: '11px', color: '#ff6b6b', margin: '4px 0 0' }}>⚠ {errors[key]}</p>
    : null

  // Drawer width — full screen on mobile
  const drawerWidth = isMobile ? '100%' : '480px'

  return (
    <div style={{ minHeight: '100vh', background: '#080f08', color: 'white' }}>
      <Sidebar />

      {/* Main content */}
      <div style={{
        marginLeft: isMobile ? 0 : '240px',
        padding: isMobile ? '72px 16px 24px' : '32px',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row',
          gap: '12px', marginBottom: '24px',
        }}>
          <div>
            <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: 'white', margin: 0 }}>Campaigns</h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
              {loading ? 'Loading...' : `${campaigns.length} campaigns · ${avgOpenRate}% avg open rate`}
            </p>
          </div>
          <button
            onClick={() => { setForm(emptyForm); setErrors({}); setDrawerOpen(true) }}
            style={{
              padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
              background: 'rgba(0,255,136,0.15)', border: '0.5px solid rgba(0,255,136,0.3)',
              color: '#00ff88', cursor: 'pointer', width: isMobile ? '100%' : 'auto',
            }}
          >
            + New Campaign
          </button>
        </div>

        {/* ── Stats — 2 cols on mobile, 4 on desktop ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: '12px', marginBottom: '20px',
        }}>
          {[
            { label: 'Total Sent',  value: totalSent.toLocaleString(),                              color: '#00ff88' },
            { label: 'Opened',      value: totalOpened.toLocaleString(),                            color: '#38bdf8' },
            { label: 'Open Rate',   value: `${avgOpenRate}%`,                                       color: '#fbbf24' },
            { label: 'Scheduled',   value: campaigns.filter(c => c.status === 'Scheduled').length,  color: '#818cf8' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)', borderRadius: '16px', padding: '16px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters — scrollable on mobile ── */}
        <div style={{ overflowX: 'auto', paddingBottom: '4px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', minWidth: 'max-content' }}>
            {['All', 'Draft', 'Scheduled', 'Sent'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{
                  padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 500,
                  cursor: 'pointer', whiteSpace: 'nowrap' as const,
                  background: filter === f ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)',
                  border:     filter === f ? '0.5px solid rgba(0,255,136,0.3)' : '0.5px solid rgba(255,255,255,0.08)',
                  color:      filter === f ? '#00ff88' : 'rgba(255,255,255,0.45)',
                }}>{f}</button>
            ))}
            <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
            {['All', 'Email', 'WhatsApp', 'SMS'].map(c => (
              <button key={c} onClick={() => setChannelFilter(c)}
                style={{
                  padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 500,
                  cursor: 'pointer', whiteSpace: 'nowrap' as const,
                  background: channelFilter === c ? (channelBg[c] || 'rgba(0,255,136,0.15)') : 'rgba(255,255,255,0.05)',
                  border:     channelFilter === c ? `0.5px solid ${channelColors[c] || 'rgba(0,255,136,0.3)'}50` : '0.5px solid rgba(255,255,255,0.08)',
                  color:      channelFilter === c ? (channelColors[c] || '#00ff88') : 'rgba(255,255,255,0.45)',
                }}>
                {c !== 'All' && `${channelIcons[c]} `}{c}
              </button>
            ))}
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Loading campaigns...</span>
          </div>
        )}

        {/* ── Campaign list ── */}
        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(campaign => (
              <div
                key={campaign.id}
                style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)', borderRadius: '16px', padding: isMobile ? '16px' : '20px', transition: 'border 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.border = '0.5px solid rgba(0,255,136,0.25)'}
                onMouseLeave={e => e.currentTarget.style.border = '0.5px solid rgba(0,255,136,0.1)'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0 }}>

                    {/* Channel icon — hidden on very small screens */}
                    {!isMobile && (
                      <div style={{ width: 40, height: 40, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0, background: channelBg[campaign.channel], border: `0.5px solid ${channelColors[campaign.channel]}30` }}>
                        {channelIcons[campaign.channel]}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Name + badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{campaign.name}</span>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, background: channelBg[campaign.channel], color: channelColors[campaign.channel] }}>
                          {channelIcons[campaign.channel]} {campaign.channel}
                        </span>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, background: statusBg[campaign.status], color: statusColors[campaign.status] }}>
                          {campaign.status}
                        </span>
                      </div>

                      {campaign.subject && (
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>
                          Subject: {campaign.subject}
                        </p>
                      )}

                      {campaign.scheduledFor && (
                        <p style={{ fontSize: '12px', color: '#fbbf24', margin: '0 0 4px' }}>
                          Scheduled for {campaign.scheduledFor}
                        </p>
                      )}

                      {/* Stats — on mobile show in 2-col grid */}
                      {campaign.status === 'Sent' && campaign.sent > 0 && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '1fr 1fr' : 'auto auto auto auto',
                          gap: isMobile ? '10px' : '24px',
                          marginTop: '12px',
                        }}>
                          {[
                            { label: 'Sent',    value: campaign.sent },
                            { label: 'Opened',  value: campaign.opened,  rate: campaign.sent    > 0 ? Math.round((campaign.opened  / campaign.sent)    * 100) : 0 },
                            { label: 'Clicked', value: campaign.clicked, rate: campaign.opened  > 0 ? Math.round((campaign.clicked / campaign.opened)  * 100) : 0 },
                          ].map(stat => (
                            <div key={stat.label}>
                              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                <span style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>{stat.value}</span>
                                {'rate' in stat && stat.rate !== undefined && (
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#00ff88' }}>{stat.rate}%</span>
                                )}
                              </div>
                            </div>
                          ))}
                          {!isMobile && (
                            <div style={{ maxWidth: '120px' }}>
                              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Open rate</div>
                              <div style={{ height: 6, borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${campaign.sent > 0 ? Math.round((campaign.opened / campaign.sent) * 100) : 0}%`, background: channelColors[campaign.channel], borderRadius: '3px' }} />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '8px' }}>
                        Created {campaign.createdAt}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexDirection: isMobile ? 'column' : 'row' }}>
                    <button
                      onClick={() => setPreviewOpen(campaign)}
                      style={{ padding: isMobile ? '10px 14px' : '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '0.5px solid rgba(0,255,136,0.2)' }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => deleteCampaign(campaign.id)}
                      style={{ padding: isMobile ? '10px 14px' : '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: 'rgba(255,107,107,0.08)', color: 'rgba(255,107,107,0.5)', border: '0.5px solid rgba(255,107,107,0.1)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.2)'; e.currentTarget.style.color = '#ff6b6b' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.08)'; e.currentTarget.style.color = 'rgba(255,107,107,0.5)' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{ padding: '64px 24px', textAlign: 'center', borderRadius: '16px', background: 'rgba(10,20,10,0.4)', border: '0.5px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>📣</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>No campaigns found</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>Create your first campaign to get started</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Backdrop ── */}
      {(drawerOpen || previewOpen) && (
        <div
          onClick={() => { setDrawerOpen(false); setPreviewOpen(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(4px)' }}
        />
      )}

      {/* ── Create Campaign Drawer — full screen on mobile ── */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: drawerWidth,
        background: '#0a140a',
        borderLeft: isMobile ? 'none' : '1px solid rgba(0,255,136,0.12)',
        borderTop: isMobile ? '1px solid rgba(0,255,136,0.12)' : 'none',
        zIndex: 300, display: 'flex', flexDirection: 'column',
        transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: drawerOpen ? '-20px 0 60px rgba(0,0,0,0.5)' : 'none',
      }}>
        {/* Drawer header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(0,255,136,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'white', margin: 0 }}>New Campaign</h2>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>Create and send a campaign to your contacts</p>
          </div>
          <button onClick={() => setDrawerOpen(false)} style={{ width: 36, height: 36, borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
        </div>

        {/* Drawer body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div>
            <label style={labelStyle}>Campaign Name *</label>
            <input style={{ ...inputStyle, borderColor: errors.name ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
              placeholder="e.g. January Promo" value={form.name}
              onChange={e => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: '' }) }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = errors.name ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
            {errorText('name')}
          </div>

          <div>
            <label style={labelStyle}>Channel</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['Email', 'WhatsApp', 'SMS'] as const).map(c => (
                <button key={c} onClick={() => setForm({ ...form, channel: c })} style={{
                  flex: 1, padding: '12px 8px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  background: form.channel === c ? channelBg[c] : 'rgba(255,255,255,0.04)',
                  border: form.channel === c ? `1px solid ${channelColors[c]}40` : '1px solid rgba(255,255,255,0.08)',
                  color: form.channel === c ? channelColors[c] : 'rgba(255,255,255,0.4)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                }}>
                  <span style={{ fontSize: '20px' }}>{channelIcons[c]}</span>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Audience</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {['All Contacts', 'Hot Leads', 'Qualified', 'Imported', 'Custom Tag'].map(a => (
                <button key={a} onClick={() => setForm({ ...form, audience: a })} style={{
                  padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                  background: form.audience === a ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.04)',
                  border: form.audience === a ? '1px solid rgba(0,255,136,0.35)' : '1px solid rgba(255,255,255,0.08)',
                  color: form.audience === a ? '#00ff88' : 'rgba(255,255,255,0.45)',
                }}>{a}</button>
              ))}
            </div>
          </div>

          {form.channel === 'Email' && (
            <div>
              <label style={labelStyle}>Subject Line *</label>
              <input style={{ ...inputStyle, borderColor: errors.subject ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
                placeholder="e.g. Exclusive offer just for you" value={form.subject}
                onChange={e => { setForm({ ...form, subject: e.target.value }); setErrors({ ...errors, subject: '' }) }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                onBlur={e => e.target.style.borderColor = errors.subject ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
              {errorText('subject')}
            </div>
          )}

          <div>
            <label style={labelStyle}>
              Message *
              {form.channel === 'SMS' && (
                <span style={{ textTransform: 'none', fontWeight: 400, marginLeft: '8px', color: form.message.length > 160 ? '#ff6b6b' : 'rgba(255,255,255,0.3)' }}>
                  {form.message.length}/160
                </span>
              )}
            </label>
            <textarea
              style={{ ...inputStyle, minHeight: form.channel === 'Email' ? '140px' : '100px', resize: 'vertical' as const, borderColor: errors.message ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
              placeholder={form.channel === 'Email' ? 'Write your email content here...' : form.channel === 'WhatsApp' ? 'Write your WhatsApp message...' : 'Write your SMS (max 160 chars)...'}
              value={form.message}
              onChange={e => { setForm({ ...form, message: e.target.value }); setErrors({ ...errors, message: '' }) }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = errors.message ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
            {errorText('message')}
          </div>

          <div>
            <label style={labelStyle}>When to send</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {[{ label: 'Send Now', value: true }, { label: 'Schedule', value: false }].map(opt => (
                <button key={String(opt.value)} onClick={() => setForm({ ...form, sendNow: opt.value })} style={{
                  flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  background: form.sendNow === opt.value ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.04)',
                  border: form.sendNow === opt.value ? '1px solid rgba(0,255,136,0.35)' : '1px solid rgba(255,255,255,0.08)',
                  color: form.sendNow === opt.value ? '#00ff88' : 'rgba(255,255,255,0.4)',
                }}>{opt.label}</button>
              ))}
            </div>
            {!form.sendNow && (
              <div>
                <input style={{ ...inputStyle, borderColor: errors.scheduledFor ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
                  placeholder="e.g. Tomorrow 9:00 AM" value={form.scheduledFor}
                  onChange={e => { setForm({ ...form, scheduledFor: e.target.value }); setErrors({ ...errors, scheduledFor: '' }) }}
                  onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                  onBlur={e => e.target.style.borderColor = errors.scheduledFor ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
                {errorText('scheduledFor')}
              </div>
            )}
          </div>

          {form.channel === 'WhatsApp' && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <p style={{ fontSize: '12px', color: '#fbbf24', margin: 0, lineHeight: 1.6 }}>
                WhatsApp broadcasts require pre-approved message templates from Meta. Your message will be submitted for approval before sending.
              </p>
            </div>
          )}

          {form.channel === 'SMS' && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}>
              <p style={{ fontSize: '12px', color: '#38bdf8', margin: 0, lineHeight: 1.6 }}>
                SMS campaigns use Africa's Talking. Each SMS costs approximately KES 1. Make sure your account has sufficient credits.
              </p>
            </div>
          )}
        </div>

        {/* Drawer footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(0,255,136,0.08)', display: 'flex', gap: '10px' }}>
          <button onClick={() => setDrawerOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: 'rgba(0,255,136,0.15)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Creating...' : form.sendNow ? 'Send Campaign' : 'Schedule Campaign'}
          </button>
        </div>
      </div>

      {/* ── Preview Modal — full screen on mobile ── */}
      {previewOpen && (
        <div style={{
          position: 'fixed',
          top:    isMobile ? 0        : '50%',
          left:   isMobile ? 0        : '50%',
          right:  isMobile ? 0        : 'auto',
          bottom: isMobile ? 0        : 'auto',
          transform: isMobile ? 'none' : 'translate(-50%, -50%)',
          width:  isMobile ? '100%'   : '500px',
          background: '#0a140a',
          borderRadius: isMobile ? '0' : '20px',
          border: '1px solid rgba(0,255,136,0.15)',
          zIndex: 300,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          maxHeight: isMobile ? '100%' : '80vh',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(0,255,136,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'white', margin: 0 }}>{previewOpen.name}</h2>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: channelBg[previewOpen.channel], color: channelColors[previewOpen.channel] }}>
                  {channelIcons[previewOpen.channel]} {previewOpen.channel}
                </span>
                <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: statusBg[previewOpen.status], color: statusColors[previewOpen.status] }}>
                  {previewOpen.status}
                </span>
              </div>
            </div>
            <button onClick={() => setPreviewOpen(null)} style={{ width: 36, height: 36, borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ×
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {previewOpen.subject && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Subject</div>
                <div style={{ fontSize: '14px', color: 'white', fontWeight: 500 }}>{previewOpen.subject}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Message</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                {previewOpen.message || 'No message content'}
              </div>
            </div>
            {previewOpen.status === 'Sent' && previewOpen.sent > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Performance</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { label: 'Sent',      value: previewOpen.sent },
                    { label: 'Opened',    value: previewOpen.opened },
                    { label: 'Clicked',   value: previewOpen.clicked },
                    { label: 'Open Rate', value: `${previewOpen.sent > 0 ? Math.round((previewOpen.opened / previewOpen.sent) * 100) : 0}%` },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>{s.label}</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#00ff88' }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}