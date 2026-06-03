'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/sidebar'
import { supabase } from '@/lib/supabase'

type DateRange = 'Last 7 days' | 'Last 30 days' | 'Last 3 months' | 'All time'

const dateRanges: DateRange[] = ['Last 7 days', 'Last 30 days', 'Last 3 months', 'All time']

// ---------------------------------------------------------------------------
// Mini line chart — sparkline used in KPI cards
// ---------------------------------------------------------------------------
function MiniLineChart({ data, color, height = 60 }: { data: number[], color: string, height?: number }) {
  if (data.length < 2) return null
  const max   = Math.max(...data)
  const min   = Math.min(...data)
  const range = max - min || 1
  const width = 300
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 10) - 5
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon  points={`0,${height} ${points} ${width},${height}`} fill={`url(#grad-${color.replace('#', '')})`} />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Bar chart — used for revenue breakdown
// ---------------------------------------------------------------------------
function BarChart({ data, color, height = 80 }: { data: number[], color: string, height?: number }) {
  const max         = Math.max(...data, 1)
  const displayData = data.slice(-12)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height }}>
      {displayData.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
          <div
            style={{ width: '100%', borderRadius: '4px 4px 0 0', height: `${(v / max) * 100}%`, background: `${color}40`, border: `0.5px solid ${color}60`, transition: 'height 0.3s ease', minHeight: v > 0 ? '4px' : '0' }}
            onMouseEnter={e => e.currentTarget.style.background = `${color}80`}
            onMouseLeave={e => e.currentTarget.style.background = `${color}40`}
          />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main analytics page
// ---------------------------------------------------------------------------
export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('Last 30 days')
  const [loading, setLoading]     = useState(true)
  const [isMobile, setIsMobile]   = useState(false)

  // KPI stats
  const [totalLeads,      setTotalLeads]      = useState(0)
  const [totalRevenue,    setTotalRevenue]    = useState(0)
  const [conversionRate,  setConversionRate]  = useState(0)
  const [avgDealValue,    setAvgDealValue]    = useState(0)

  // Chart data
  const [leadGrowthData, setLeadGrowthData] = useState<number[]>([])
  const [revenueData,    setRevenueData]    = useState<number[]>([])

  // Table data
  const [pipelineData,  setPipelineData]  = useState<{ stage: string; count: number; value: number; color: string }[]>([])
  const [campaignData,  setCampaignData]  = useState<{ name: string; channel: string; sent: number; opened: number; clicked: number; color: string }[]>([])
  const [teamData,      setTeamData]      = useState<{ name: string; leads: number; converted: number; revenue: number; tasks: number }[]>([])
  const [sourceData,    setSourceData]    = useState<{ source: string; count: number; color: string }[]>([])

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { fetchAnalytics() }, [dateRange])

  const getDateFilter = () => {
    const now = new Date()
    if (dateRange === 'Last 7 days')    return new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString()
    if (dateRange === 'Last 30 days')   return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    if (dateRange === 'Last 3 months')  return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
    return new Date('2020-01-01').toISOString()
  }

  const fetchAnalytics = async () => {
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
      const orgId      = userProfile.organisation_id
      const dateFilter = getDateFilter()

      const [leadsRes, stagesRes, campaignsRes, tasksRes, contactsRes] = await Promise.all([
        supabase.from('leads').select('*, contacts(name), pipeline_stages(label, color)').eq('organisation_id', orgId).gte('created_at', dateFilter),
        supabase.from('pipeline_stages').select('*').eq('organisation_id', orgId),
        supabase.from('campaigns').select('*').eq('organisation_id', orgId).gte('created_at', dateFilter),
        supabase.from('tasks').select('*').eq('organisation_id', orgId).gte('created_at', dateFilter),
        supabase.from('contacts').select('*').eq('organisation_id', orgId).gte('created_at', dateFilter),
      ])

      const leads     = leadsRes.data     || []
      const stages    = stagesRes.data    || []
      const campaigns = campaignsRes.data || []
      const tasks     = tasksRes.data     || []
      const contacts  = contactsRes.data  || []

      const converted = leads.filter(l => l.converted_at)
      const revenue   = converted.reduce((s, l) => s + (l.value || 0), 0)
      const convRate  = leads.length > 0 ? Math.round((converted.length / leads.length) * 100) : 0
      const avgDeal   = converted.length > 0 ? Math.round(revenue / converted.length) : 0

      setTotalLeads(leads.length)
      setTotalRevenue(revenue)
      setConversionRate(convRate)
      setAvgDealValue(avgDeal)

      const days = dateRange === 'Last 7 days' ? 7 : 30
      const growthData = Array(days).fill(0)
      leads.forEach(l => {
        const daysAgo = Math.floor((Date.now() - new Date(l.created_at).getTime()) / (24 * 60 * 60 * 1000))
        const idx = days - 1 - Math.min(daysAgo, days - 1)
        if (idx >= 0 && idx < days) growthData[idx]++
      })
      for (let i = 1; i < growthData.length; i++) growthData[i] += growthData[i - 1]
      setLeadGrowthData(growthData)

      const revData = Array(days).fill(0)
      converted.forEach(l => {
        const daysAgo = Math.floor((Date.now() - new Date(l.converted_at).getTime()) / (24 * 60 * 60 * 1000))
        const idx = days - 1 - Math.min(daysAgo, days - 1)
        if (idx >= 0 && idx < days) revData[idx] += l.value || 0
      })
      setRevenueData(revData)

      setPipelineData(stages.map(stage => ({
        stage: stage.label,
        color: stage.color,
        count: leads.filter(l => l.stage_id === stage.id).length,
        value: leads.filter(l => l.stage_id === stage.id).reduce((s, l) => s + (l.value || 0), 0),
      })).filter(s => s.count > 0))

      setCampaignData(campaigns.slice(0, 5).map(c => ({
        name:    c.name,
        channel: c.channel,
        sent:    c.sent    || 0,
        opened:  c.opened  || 0,
        clicked: c.clicked || 0,
        color:   c.channel === 'email' ? '#38bdf8' : c.channel === 'whatsapp' ? '#00ff88' : '#fbbf24',
      })))

      const sourceMap: Record<string, number> = {}
      contacts.forEach(c => { sourceMap[c.source || 'manual'] = (sourceMap[c.source || 'manual'] || 0) + 1 })
      const sourceColors = ['#00ff88', '#38bdf8', '#818cf8', '#fbbf24', '#f97316']
      setSourceData(Object.entries(sourceMap).map(([source, count], i) => ({ source, count, color: sourceColors[i % sourceColors.length] })))

      const assigneeMap: Record<string, { leads: number; converted: number; revenue: number; tasks: number }> = {}
      leads.forEach(l => {
        const name = l.assigned_to || 'Unassigned'
        if (!assigneeMap[name]) assigneeMap[name] = { leads: 0, converted: 0, revenue: 0, tasks: 0 }
        assigneeMap[name].leads++
        if (l.converted_at) { assigneeMap[name].converted++; assigneeMap[name].revenue += l.value || 0 }
      })
      tasks.forEach(t => {
        const name = t.assigned_to || 'Unassigned'
        if (!assigneeMap[name]) assigneeMap[name] = { leads: 0, converted: 0, revenue: 0, tasks: 0 }
        if (t.done) assigneeMap[name].tasks++
      })
      setTeamData(Object.entries(assigneeMap).map(([name, data]) => ({ name, ...data })))

    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const teamColors = ['#00ff88', '#38bdf8', '#fbbf24', '#818cf8', '#f97316']

  // Shared card style
  const card = {
    background: 'rgba(10,20,10,0.8)',
    border: '0.5px solid rgba(0,255,136,0.1)',
    borderRadius: '16px',
    padding: '20px',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080f08', color: 'white' }}>
      <Sidebar />

      {/* Main content — ml-60 on desktop, padding-top on mobile for hamburger */}
      <div style={{
        marginLeft: isMobile ? 0 : '240px',
        paddingTop: isMobile ? '64px' : 0,
        padding: isMobile ? '64px 16px 24px' : '32px',
        overflowY: 'auto',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '24px',
        }}>
          <div>
            <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: 'white', margin: 0 }}>Analytics</h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>Real-time business performance</p>
          </div>

          {/* Date range filters — scrollable on mobile */}
          <div style={{
            display: 'flex', gap: '6px',
            overflowX: 'auto', paddingBottom: isMobile ? '4px' : 0,
            flexShrink: 0,
          }}>
            {dateRanges.map(r => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                style={{
                  padding: '8px 12px', borderRadius: '10px', fontSize: '12px',
                  fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' as const,
                  background: dateRange === r ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)',
                  border:     dateRange === r ? '0.5px solid rgba(0,255,136,0.3)' : '0.5px solid rgba(255,255,255,0.08)',
                  color:      dateRange === r ? '#00ff88' : 'rgba(255,255,255,0.45)',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Loading analytics...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* ── KPI Cards — 2 cols on mobile, 4 on desktop ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '20px',
            }}>
              {[
                { label: 'Total Leads',      value: totalLeads,                                 color: '#818cf8', data: leadGrowthData },
                { label: 'Total Revenue',    value: `KES ${(totalRevenue / 1000).toFixed(0)}K`, color: '#00ff88', data: revenueData },
                { label: 'Conversion Rate',  value: `${conversionRate}%`,                       color: '#38bdf8', data: leadGrowthData },
                { label: 'Avg Deal Value',   value: `KES ${(avgDealValue / 1000).toFixed(0)}K`, color: '#fbbf24', data: revenueData },
              ].map(kpi => (
                <div key={kpi.label} style={card}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>
                    {kpi.label}
                  </div>
                  <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>
                    {kpi.value}
                  </div>
                  <MiniLineChart data={kpi.data.length > 1 ? kpi.data : [0, 1]} color={kpi.color} height={40} />
                </div>
              ))}
            </div>

            {/* ── Lead Growth + Revenue — stacked on mobile ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '12px',
              marginBottom: '20px',
            }}>
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>Lead Growth</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{dateRange}</div>
                  </div>
                  <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '8px', background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}>
                    {totalLeads} total
                  </span>
                </div>
                <MiniLineChart data={leadGrowthData.length > 1 ? leadGrowthData : [0, 0, 1]} color="#818cf8" height={isMobile ? 80 : 120} />
              </div>

              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>Revenue</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{dateRange}</div>
                  </div>
                  <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '8px', background: 'rgba(0,255,136,0.12)', color: '#00ff88' }}>
                    KES {(totalRevenue / 1000).toFixed(1)}K
                  </span>
                </div>
                <BarChart data={revenueData.length > 0 ? revenueData : [0]} color="#00ff88" height={isMobile ? 80 : 120} />
              </div>
            </div>

            {/* ── Pipeline + Sources — stacked on mobile ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '12px',
              marginBottom: '20px',
            }}>
              {/* Pipeline conversion */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>Pipeline Conversion</div>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{totalLeads} leads</span>
                </div>
                {pipelineData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No pipeline data yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {pipelineData.map(stage => {
                      const pct = totalLeads > 0 ? Math.round((stage.count / totalLeads) * 100) : 0
                      return (
                        <div key={stage.stage}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                              <span style={{ fontSize: '12px', fontWeight: 500, color: 'white' }}>{stage.stage}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>KES {(stage.value / 1000).toFixed(0)}K</span>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: stage.color }}>{stage.count}</span>
                            </div>
                          </div>
                          <div style={{ height: 6, borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: stage.color, borderRadius: '3px' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Overall conversion</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#00ff88' }}>{conversionRate}%</span>
                </div>
              </div>

              {/* Lead sources */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>Lead Sources</div>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{sourceData.reduce((s, d) => s + d.count, 0)} total</span>
                </div>
                {sourceData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No source data yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {sourceData.map(source => {
                      const total = sourceData.reduce((s, d) => s + d.count, 0)
                      const pct   = total > 0 ? Math.round((source.count / total) * 100) : 0
                      return (
                        <div key={source.source}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 500, color: 'white', textTransform: 'capitalize' }}>{source.source}</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: source.color }}>{pct}%</span>
                              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{source.count}</span>
                            </div>
                          </div>
                          <div style={{ height: 6, borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: source.color, borderRadius: '3px' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Campaign Performance — horizontal scroll on mobile ── */}
            <div style={{ ...card, marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>Campaign Performance</div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{campaignData.length} campaigns</span>
              </div>
              {campaignData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No campaign data yet</div>
              ) : isMobile ? (
                // Mobile: card list instead of table
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {campaignData.map((c, i) => {
                    const openRate = c.sent > 0 ? Math.round((c.opened / c.sent) * 100) : 0
                    return (
                      <div key={i} style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{c.name}</span>
                          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: `${c.color}15`, color: c.color, fontWeight: 600, textTransform: 'capitalize' }}>{c.channel}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                          {[{ label: 'Sent', value: c.sent }, { label: 'Opened', value: c.opened }, { label: 'Clicked', value: c.clicked }].map(s => (
                            <div key={s.label} style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>{s.value}</div>
                              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: 6, borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${openRate}%`, background: c.color, borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: c.color, flexShrink: 0 }}>{openRate}% open</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                // Desktop: full table
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                        {['Campaign', 'Channel', 'Sent', 'Opened', 'Clicked', 'Open Rate'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {campaignData.map((c, i) => {
                        const openRate = c.sent > 0 ? Math.round((c.opened / c.sent) * 100) : 0
                        return (
                          <tr key={i} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,255,136,0.03)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: 'white' }}>{c.name}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: `${c.color}15`, color: c.color, fontWeight: 600, textTransform: 'capitalize' }}>{c.channel}</span>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'white' }}>{c.sent}</td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'white' }}>{c.opened}</td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'white' }}>{c.clicked}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: 64, height: 6, borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${openRate}%`, background: c.color, borderRadius: '3px' }} />
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: c.color }}>{openRate}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Team Performance — 1 col on mobile, 3 on desktop ── */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>Team Performance</div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{dateRange}</span>
              </div>
              {teamData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No team data yet</div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                  gap: '12px',
                }}>
                  {teamData.slice(0, 6).map((member, i) => {
                    const color    = teamColors[i % teamColors.length]
                    const convRate = member.leads > 0 ? Math.round((member.converted / member.leads) * 100) : 0
                    return (
                      <div key={member.name} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: `0.5px solid ${color}20` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0, background: `${color}18`, color, border: `1px solid ${color}25` }}>
                            {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {[
                            { label: 'Leads',      value: member.leads,                                color: '#818cf8' },
                            { label: 'Converted',  value: member.converted,                            color: '#00ff88' },
                            { label: 'Revenue',    value: `KES ${(member.revenue / 1000).toFixed(0)}K`, color: '#fbbf24' },
                            { label: 'Tasks done', value: member.tasks,                                color: '#38bdf8' },
                          ].map(stat => (
                            <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{stat.label}</span>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: stat.color }}>{stat.value}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Conversion</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color }}>{convRate}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${convRate}%`, background: color, borderRadius: '3px' }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}