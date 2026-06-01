'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/sidebar'
import { supabase } from '@/lib/supabase'

type DateRange = 'Last 7 days' | 'Last 30 days' | 'Last 3 months' | 'All time'

const dateRanges: DateRange[] = ['Last 7 days', 'Last 30 days', 'Last 3 months', 'All time']

function MiniLineChart({ data, color, height = 60 }: { data: number[], color: string, height?: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
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
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#grad-${color.replace('#', '')})`} />
    </svg>
  )
}

function BarChart({ data, color, height = 80 }: { data: number[], color: string, height?: number }) {
  const max = Math.max(...data, 1)
  const displayData = data.slice(-12)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height }}>
      {displayData.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
          <div style={{ width: '100%', borderRadius: '4px 4px 0 0', height: `${(v / max) * 100}%`, background: `${color}40`, border: `0.5px solid ${color}60`, transition: 'height 0.3s ease', minHeight: v > 0 ? '4px' : '0' }}
            onMouseEnter={e => e.currentTarget.style.background = `${color}80`}
            onMouseLeave={e => e.currentTarget.style.background = `${color}40`} />
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('Last 30 days')
  const [loading, setLoading] = useState(true)

  // Stats
  const [totalLeads, setTotalLeads] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [conversionRate, setConversionRate] = useState(0)
  const [avgDealValue, setAvgDealValue] = useState(0)

  // Chart data
  const [leadGrowthData, setLeadGrowthData] = useState<number[]>([])
  const [revenueData, setRevenueData] = useState<number[]>([])

  // Tables
  const [pipelineData, setPipelineData] = useState<{ stage: string; count: number; value: number; color: string }[]>([])
  const [campaignData, setCampaignData] = useState<{ name: string; channel: string; sent: number; opened: number; clicked: number; color: string }[]>([])
  const [teamData, setTeamData] = useState<{ name: string; leads: number; converted: number; revenue: number; tasks: number }[]>([])
  const [sourceData, setSourceData] = useState<{ source: string; count: number; color: string }[]>([])

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const getDateFilter = () => {
    const now = new Date()
    if (dateRange === 'Last 7 days') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    if (dateRange === 'Last 30 days') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    if (dateRange === 'Last 3 months') return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
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
      const orgId = userProfile.organisation_id
      const dateFilter = getDateFilter()

      // Fetch all data in parallel
      const [leadsRes, stagesRes, campaignsRes, tasksRes, contactsRes] = await Promise.all([
        supabase.from('leads').select('*, contacts(name), pipeline_stages(label, color)').eq('organisation_id', orgId).gte('created_at', dateFilter),
        supabase.from('pipeline_stages').select('*').eq('organisation_id', orgId),
        supabase.from('campaigns').select('*').eq('organisation_id', orgId).gte('created_at', dateFilter),
        supabase.from('tasks').select('*').eq('organisation_id', orgId).gte('created_at', dateFilter),
        supabase.from('contacts').select('*').eq('organisation_id', orgId).gte('created_at', dateFilter),
      ])

      const leads = leadsRes.data || []
      const stages = stagesRes.data || []
      const campaigns = campaignsRes.data || []
      const tasks = tasksRes.data || []
      const contacts = contactsRes.data || []

      // KPIs
      const converted = leads.filter(l => l.converted_at)
      const revenue = converted.reduce((s, l) => s + (l.value || 0), 0)
      const convRate = leads.length > 0 ? Math.round((converted.length / leads.length) * 100) : 0
      const avgDeal = converted.length > 0 ? Math.round(revenue / converted.length) : 0

      setTotalLeads(leads.length)
      setTotalRevenue(revenue)
      setConversionRate(convRate)
      setAvgDealValue(avgDeal)

      // Lead growth chart — group by day
      const days = dateRange === 'Last 7 days' ? 7 : dateRange === 'Last 30 days' ? 30 : dateRange === 'Last 3 months' ? 12 : 12
      const growthData = Array(days).fill(0)
      leads.forEach(l => {
        const daysAgo = Math.floor((Date.now() - new Date(l.created_at).getTime()) / (24 * 60 * 60 * 1000))
        const idx = days - 1 - Math.min(daysAgo, days - 1)
        if (idx >= 0 && idx < days) growthData[idx]++
      })
      // Cumulative
      for (let i = 1; i < growthData.length; i++) growthData[i] += growthData[i - 1]
      setLeadGrowthData(growthData)

      // Revenue chart
      const revData = Array(days).fill(0)
      converted.forEach(l => {
        const daysAgo = Math.floor((Date.now() - new Date(l.converted_at).getTime()) / (24 * 60 * 60 * 1000))
        const idx = days - 1 - Math.min(daysAgo, days - 1)
        if (idx >= 0 && idx < days) revData[idx] += l.value || 0
      })
      setRevenueData(revData)

      // Pipeline breakdown
      setPipelineData(stages.map(stage => ({
        stage: stage.label,
        color: stage.color,
        count: leads.filter(l => l.stage_id === stage.id).length,
        value: leads.filter(l => l.stage_id === stage.id).reduce((s, l) => s + (l.value || 0), 0),
      })).filter(s => s.count > 0))

      // Campaign performance
      setCampaignData(campaigns.slice(0, 5).map(c => ({
        name: c.name,
        channel: c.channel,
        sent: c.sent || 0,
        opened: c.opened || 0,
        clicked: c.clicked || 0,
        color: c.channel === 'email' ? '#38bdf8' : c.channel === 'whatsapp' ? '#00ff88' : '#fbbf24',
      })))

      // Lead sources
      const sourceMap: Record<string, number> = {}
      contacts.forEach(c => { sourceMap[c.source || 'manual'] = (sourceMap[c.source || 'manual'] || 0) + 1 })
      const sourceColors = ['#00ff88', '#38bdf8', '#818cf8', '#fbbf24', '#f97316']
      setSourceData(Object.entries(sourceMap).map(([source, count], i) => ({ source, count, color: sourceColors[i % sourceColors.length] })))

      // Team performance
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

  return (
    <div className="min-h-screen flex" style={{ background: '#080f08', color: 'white' }}>
      <Sidebar />

      <div className="ml-60 flex-1 p-8 overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Real-time business performance</p>
          </div>
          <div className="flex items-center gap-2">
            {dateRanges.map(r => (
              <button key={r} onClick={() => setDateRange(r)}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: dateRange === r ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)',
                  border: dateRange === r ? '0.5px solid rgba(0,255,136,0.3)' : '0.5px solid rgba(255,255,255,0.08)',
                  color: dateRange === r ? '#00ff88' : 'rgba(255,255,255,0.45)',
                }}>{r}</button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Loading analytics...</div>
          </div>
        )}

        {!loading && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Leads', value: totalLeads, color: '#818cf8', data: leadGrowthData },
                { label: 'Total Revenue', value: `KES ${(totalRevenue / 1000).toFixed(0)}K`, color: '#00ff88', data: revenueData },
                { label: 'Conversion Rate', value: `${conversionRate}%`, color: '#38bdf8', data: leadGrowthData },
                { label: 'Avg Deal Value', value: `KES ${(avgDealValue / 1000).toFixed(0)}K`, color: '#fbbf24', data: revenueData },
              ].map(kpi => (
                <div key={kpi.label} className="rounded-2xl p-5"
                  style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}>
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{kpi.label}</div>
                  <div className="text-2xl font-bold text-white mb-3">{kpi.value}</div>
                  <MiniLineChart data={kpi.data.length > 1 ? kpi.data : [0, 1]} color={kpi.color} height={48} />
                </div>
              ))}
            </div>

            {/* Lead Growth + Revenue */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-2xl p-5" style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Lead Growth</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{dateRange}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}>
                    {totalLeads} total
                  </span>
                </div>
                <MiniLineChart data={leadGrowthData.length > 1 ? leadGrowthData : [0, 0, 1]} color="#818cf8" height={120} />
              </div>

              <div className="rounded-2xl p-5" style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Revenue</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{dateRange}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(0,255,136,0.12)', color: '#00ff88' }}>
                    KES {(totalRevenue / 1000).toFixed(1)}K total
                  </span>
                </div>
                <BarChart data={revenueData.length > 0 ? revenueData : [0]} color="#00ff88" height={120} />
              </div>
            </div>

            {/* Pipeline + Sources */}
            <div className="grid grid-cols-2 gap-4 mb-6">

              {/* Pipeline Conversion */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-semibold text-white">Pipeline Conversion</h2>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{totalLeads} leads</span>
                </div>
                {pipelineData.length === 0 ? (
                  <div className="py-8 text-center">
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No pipeline data yet</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pipelineData.map(stage => {
                      const pct = totalLeads > 0 ? Math.round((stage.count / totalLeads) * 100) : 0
                      return (
                        <div key={stage.stage}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                              <span className="text-xs font-medium text-white">{stage.stage}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>KES {(stage.value / 1000).toFixed(0)}K</span>
                              <span className="text-xs font-bold" style={{ color: stage.color }}>{stage.count}</span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: stage.color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Overall conversion</span>
                  <span className="text-sm font-bold" style={{ color: '#00ff88' }}>{conversionRate}%</span>
                </div>
              </div>

              {/* Lead Sources */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-semibold text-white">Lead Sources</h2>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {sourceData.reduce((s, d) => s + d.count, 0)} total
                  </span>
                </div>
                {sourceData.length === 0 ? (
                  <div className="py-8 text-center">
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No source data yet</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sourceData.map(source => {
                      const total = sourceData.reduce((s, d) => s + d.count, 0)
                      const pct = total > 0 ? Math.round((source.count / total) * 100) : 0
                      return (
                        <div key={source.source}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-white capitalize">{source.source}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold" style={{ color: source.color }}>{pct}%</span>
                              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{source.count}</span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: source.color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Campaign Performance */}
            <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-white">Campaign Performance</h2>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{campaignData.length} campaigns</span>
              </div>
              {campaignData.length === 0 ? (
                <div className="py-8 text-center">
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No campaign data yet</div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl" style={{ border: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                        {['Campaign', 'Channel', 'Sent', 'Opened', 'Clicked', 'Open Rate'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider"
                            style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
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
                            <td className="px-4 py-3 text-sm font-medium text-white">{c.name}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-0.5 rounded-lg font-medium capitalize"
                                style={{ background: `${c.color}15`, color: c.color }}>{c.channel}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-white">{c.sent}</td>
                            <td className="px-4 py-3 text-sm text-white">{c.opened}</td>
                            <td className="px-4 py-3 text-sm text-white">{c.clicked}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                  <div className="h-full rounded-full" style={{ width: `${openRate}%`, background: c.color }} />
                                </div>
                                <span className="text-xs font-bold" style={{ color: c.color }}>{openRate}%</span>
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

            {/* Team Performance */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-white">Team Performance</h2>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{dateRange}</span>
              </div>
              {teamData.length === 0 ? (
                <div className="py-8 text-center">
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No team data yet</div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {teamData.slice(0, 6).map((member, i) => {
                    const color = teamColors[i % teamColors.length]
                    const convRate = member.leads > 0 ? Math.round((member.converted / member.leads) * 100) : 0
                    return (
                      <div key={member.name} className="rounded-xl p-4"
                        style={{ background: 'rgba(255,255,255,0.03)', border: `0.5px solid ${color}20` }}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                            style={{ background: `${color}18`, color, border: `1px solid ${color}25` }}>
                            {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="text-sm font-semibold text-white truncate">{member.name}</div>
                        </div>
                        <div className="space-y-2">
                          {[
                            { label: 'Leads', value: member.leads, color: '#818cf8' },
                            { label: 'Converted', value: member.converted, color: '#00ff88' },
                            { label: 'Revenue', value: `KES ${(member.revenue / 1000).toFixed(0)}K`, color: '#fbbf24' },
                            { label: 'Tasks done', value: member.tasks, color: '#38bdf8' },
                          ].map(stat => (
                            <div key={stat.label} className="flex items-center justify-between">
                              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{stat.label}</span>
                              <span className="text-xs font-bold" style={{ color: stat.color }}>{stat.value}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Conversion</span>
                            <span className="text-xs font-bold" style={{ color }}>{convRate}%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{ width: `${convRate}%`, background: color }} />
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