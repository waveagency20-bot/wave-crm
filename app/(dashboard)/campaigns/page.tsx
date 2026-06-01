'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/sidebar'
import { supabase } from '@/lib/supabase'

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
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string>('')
  const [filter, setFilter] = useState('All')
  const [channelFilter, setChannelFilter] = useState('All')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [previewOpen, setPreviewOpen] = useState<Campaign | null>(null)

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userProfile } = await supabase
        .from('users')
        .select('organisation_id')
        .eq('auth_id', user.id)
        .single()

      if (!userProfile) return
      setOrgId(userProfile.organisation_id)

      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('organisation_id', userProfile.organisation_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setCampaigns(data.map((c: any) => ({
        id: c.id,
        name: c.name,
        channel: c.channel === 'email' ? 'Email' : c.channel === 'whatsapp' ? 'WhatsApp' : 'SMS',
        status: c.status === 'draft' ? 'Draft' : c.status === 'scheduled' ? 'Scheduled' : c.status === 'sent' ? 'Sent' : 'Active',
        audience: c.audience || 0,
        sent: c.sent || 0,
        opened: c.opened || 0,
        clicked: c.clicked || 0,
        createdAt: timeAgo(c.created_at),
        scheduledFor: c.scheduled_for,
        message: c.message || '',
        subject: c.subject,
      })))
    } catch (err) {
      console.error('Error fetching campaigns:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = campaigns.filter(c => {
    const matchStatus = filter === 'All' || c.status === filter
    const matchChannel = channelFilter === 'All' || c.channel === channelFilter
    return matchStatus && matchChannel
  })

  const totalSent = campaigns.reduce((s, c) => s + c.sent, 0)
  const totalOpened = campaigns.reduce((s, c) => s + c.opened, 0)
  const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}
    if (!form.name) newErrors.name = 'Campaign name is required'
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
          name: form.name,
          channel: form.channel.toLowerCase(),
          status: form.sendNow ? 'sent' : 'scheduled',
          subject: form.subject || null,
          message: form.message,
          audience: form.audience,
          scheduled_for: form.sendNow ? null : form.scheduledFor,
          sent: 0,
          opened: 0,
          clicked: 0,
        })
        .select()
        .single()

      if (error) throw error

      setCampaigns(prev => [{
        id: data.id,
        name: data.name,
        channel: data.channel === 'email' ? 'Email' : data.channel === 'whatsapp' ? 'WhatsApp' : 'SMS',
        status: data.status === 'sent' ? 'Sent' : 'Scheduled',
        audience: 0,
        sent: 0,
        opened: 0,
        clicked: 0,
        createdAt: 'Just now',
        scheduledFor: data.scheduled_for,
        message: data.message || '',
        subject: data.subject,
      }, ...prev])

      setForm(emptyForm)
      setErrors({})
      setSubmitting(false)
      setDrawerOpen(false)

    } catch (err: any) {
      console.error('Error saving campaign:', err)
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

  return (
    <div className="min-h-screen flex" style={{ background: '#080f08', color: 'white' }}>
      <Sidebar />

      <div className="ml-60 flex-1 p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Campaigns</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {loading ? 'Loading...' : `${campaigns.length} campaigns · ${avgOpenRate}% avg open rate`}
            </p>
          </div>
          <button
            onClick={() => { setForm(emptyForm); setErrors({}); setDrawerOpen(true) }}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(0,255,136,0.15)', border: '0.5px solid rgba(0,255,136,0.3)', color: '#00ff88' }}>
            + New Campaign
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Sent', value: totalSent.toLocaleString(), color: '#00ff88' },
            { label: 'Total Opened', value: totalOpened.toLocaleString(), color: '#38bdf8' },
            { label: 'Avg Open Rate', value: `${avgOpenRate}%`, color: '#fbbf24' },
            { label: 'Scheduled', value: campaigns.filter(c => c.status === 'Scheduled').length, color: '#818cf8' },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl p-4"
              style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}>
              <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {stat.label}
              </div>
              <div className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            {['All', 'Draft', 'Scheduled', 'Sent'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: filter === f ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)',
                  border: filter === f ? '0.5px solid rgba(0,255,136,0.3)' : '0.5px solid rgba(255,255,255,0.08)',
                  color: filter === f ? '#00ff88' : 'rgba(255,255,255,0.45)',
                }}>{f}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-2">
            {['All', 'Email', 'WhatsApp', 'SMS'].map(c => (
              <button key={c} onClick={() => setChannelFilter(c)}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: channelFilter === c ? `${channelBg[c] || 'rgba(0,255,136,0.15)'}` : 'rgba(255,255,255,0.05)',
                  border: channelFilter === c ? `0.5px solid ${channelColors[c] || 'rgba(0,255,136,0.3)'}50` : '0.5px solid rgba(255,255,255,0.08)',
                  color: channelFilter === c ? (channelColors[c] || '#00ff88') : 'rgba(255,255,255,0.45)',
                }}>
                {c !== 'All' && channelIcons[c]} {c}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Loading campaigns...</div>
          </div>
        )}

        {/* Campaigns List */}
        {!loading && (
          <div className="space-y-3">
            {filtered.map(campaign => (
              <div key={campaign.id}
                className="rounded-2xl p-5 transition-all"
                style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}
                onMouseEnter={e => e.currentTarget.style.border = '0.5px solid rgba(0,255,136,0.25)'}
                onMouseLeave={e => e.currentTarget.style.border = '0.5px solid rgba(0,255,136,0.1)'}>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: channelBg[campaign.channel], border: `0.5px solid ${channelColors[campaign.channel]}30` }}>
                      {channelIcons[campaign.channel]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-white">{campaign.name}</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-lg font-medium"
                          style={{ background: channelBg[campaign.channel], color: channelColors[campaign.channel] }}>
                          {channelIcons[campaign.channel]} {campaign.channel}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-lg font-medium"
                          style={{ background: statusBg[campaign.status], color: statusColors[campaign.status] }}>
                          {campaign.status}
                        </span>
                      </div>

                      {campaign.subject && (
                        <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          Subject: {campaign.subject}
                        </p>
                      )}

                      {campaign.scheduledFor && (
                        <p className="text-xs mb-2" style={{ color: '#fbbf24' }}>
                          🕐 Scheduled for {campaign.scheduledFor}
                        </p>
                      )}

                      {campaign.status === 'Sent' && campaign.sent > 0 && (
                        <div className="flex items-center gap-6 mt-3">
                          {[
                            { label: 'Sent', value: campaign.sent },
                            { label: 'Opened', value: campaign.opened, rate: campaign.sent > 0 ? Math.round((campaign.opened / campaign.sent) * 100) : 0 },
                            { label: 'Clicked', value: campaign.clicked, rate: campaign.opened > 0 ? Math.round((campaign.clicked / campaign.opened) * 100) : 0 },
                          ].map(stat => (
                            <div key={stat.label}>
                              <div className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{stat.label}</div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-sm font-bold text-white">{stat.value}</span>
                                {'rate' in stat && stat.rate !== undefined && (
                                  <span className="text-xs font-medium" style={{ color: '#00ff88' }}>{stat.rate}%</span>
                                )}
                              </div>
                            </div>
                          ))}
                          <div className="flex-1 max-w-32">
                            <div className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Open rate</div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                              <div className="h-full rounded-full"
                                style={{ width: `${campaign.sent > 0 ? Math.round((campaign.opened / campaign.sent) * 100) : 0}%`, background: channelColors[campaign.channel] }} />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        Created {campaign.createdAt}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setPreviewOpen(campaign)}
                      className="text-xs px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '0.5px solid rgba(0,255,136,0.2)' }}>
                      View
                    </button>
                    <button
                      onClick={() => deleteCampaign(campaign.id)}
                      className="text-xs px-2.5 py-1.5 rounded-lg transition-all"
                      style={{ background: 'rgba(255,107,107,0.08)', color: 'rgba(255,107,107,0.5)', border: '0.5px solid rgba(255,107,107,0.1)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.2)'; e.currentTarget.style.color = '#ff6b6b' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.08)'; e.currentTarget.style.color = 'rgba(255,107,107,0.5)' }}>
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="py-16 text-center rounded-2xl"
                style={{ background: 'rgba(10,20,10,0.4)', border: '0.5px solid rgba(255,255,255,0.05)' }}>
                <div className="text-4xl mb-3">📣</div>
                <div className="text-sm font-medium text-white">No campaigns found</div>
                <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Create your first campaign to get started
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overlays */}
      {(drawerOpen || previewOpen) && (
        <div onClick={() => { setDrawerOpen(false); setPreviewOpen(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
      )}

      {/* Create Campaign Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px',
        background: '#0a140a', borderLeft: '1px solid rgba(0,255,136,0.12)',
        zIndex: 300, display: 'flex', flexDirection: 'column',
        transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: drawerOpen ? '-20px 0 60px rgba(0,0,0,0.5)' : 'none',
      }}>
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(0,255,136,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', margin: 0 }}>New Campaign</h2>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>Create and send a campaign to your contacts</p>
          </div>
          <button onClick={() => setDrawerOpen(false)} style={{ width: 32, height: 32, borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

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
                  padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
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
                placeholder="e.g. Exclusive offer just for you 🎉" value={form.subject}
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
                  {form.message.length}/160 chars
                </span>
              )}
            </label>
            <textarea
              style={{ ...inputStyle, minHeight: form.channel === 'Email' ? '160px' : '100px', resize: 'vertical' as const, borderColor: errors.message ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
              placeholder={form.channel === 'Email' ? 'Write your email content here...' : form.channel === 'WhatsApp' ? 'Write your WhatsApp message here...' : 'Write your SMS (max 160 chars)...'}
              value={form.message}
              onChange={e => { setForm({ ...form, message: e.target.value }); setErrors({ ...errors, message: '' }) }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = errors.message ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
            {errorText('message')}
          </div>

          <div>
            <label style={labelStyle}>When to send</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {[{ label: '⚡ Send Now', value: true }, { label: '🕐 Schedule', value: false }].map(opt => (
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
                ⚠️ WhatsApp broadcasts require pre-approved message templates from Meta. Your message will be submitted for approval before sending.
              </p>
            </div>
          )}

          {form.channel === 'SMS' && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}>
              <p style={{ fontSize: '12px', color: '#38bdf8', margin: 0, lineHeight: 1.6 }}>
                ℹ️ SMS campaigns use Africa's Talking. Each SMS costs ~KES 1. Make sure your account has sufficient credits.
              </p>
            </div>
          )}
        </div>

        <div style={{ padding: '20px 28px', borderTop: '1px solid rgba(0,255,136,0.08)', display: 'flex', gap: '10px' }}>
          <button onClick={() => setDrawerOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: 'rgba(0,255,136,0.15)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Creating...' : form.sendNow ? '⚡ Send Campaign' : '🕐 Schedule Campaign'}
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {previewOpen && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '500px', background: '#0a140a', borderRadius: '20px', border: '1px solid rgba(0,255,136,0.15)', zIndex: 300, boxShadow: '0 24px 64px rgba(0,0,0,0.6)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(0,255,136,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', margin: 0 }}>{previewOpen.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <span style={{ fontSize: '12px', padding: '2px 10px', borderRadius: '20px', background: channelBg[previewOpen.channel], color: channelColors[previewOpen.channel] }}>
                  {channelIcons[previewOpen.channel]} {previewOpen.channel}
                </span>
                <span style={{ fontSize: '12px', padding: '2px 10px', borderRadius: '20px', background: statusBg[previewOpen.status], color: statusColors[previewOpen.status] }}>
                  {previewOpen.status}
                </span>
              </div>
            </div>
            <button onClick={() => setPreviewOpen(null)} style={{ width: 32, height: 32, borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                    { label: 'Sent', value: previewOpen.sent },
                    { label: 'Opened', value: previewOpen.opened },
                    { label: 'Clicked', value: previewOpen.clicked },
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