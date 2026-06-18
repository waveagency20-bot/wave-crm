'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/sidebar'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/auth'
import {
  Users, TrendingUp, DollarSign, CheckSquare,
  MessageSquare, Megaphone, RefreshCw, BarChart2,
  CheckCircle, Circle,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Stat = {
  label: string
  value: string | number
  change: string
  color: string
  icon: React.ReactNode
}

type RecentLead = {
  id: string
  name: string
  company: string
  value: number
  stage: string
  stageColor: string
  time: string
}

type Task = {
  id: string
  title: string
  priority: string
  dueDate: string
  assignedTo: string
  done: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const priorityColors: Record<string, string> = {
  high: '#ff6b6b', medium: '#fbbf24', low: '#00ff88',
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
export default function DashboardPage() {
  const { user }                                    = useAuth()
  const [loading,          setLoading]          = useState(true)
  const [firstName,        setFirstName]        = useState('')
  const [orgName,          setOrgName]          = useState('')
  const [stats,            setStats]            = useState<Stat[]>([])
  const [recentLeads,      setRecentLeads]      = useState<RecentLead[]>([])
  const [todayTasks,       setTodayTasks]       = useState<Task[]>([])
  const [pipelineOverview, setPipelineOverview] = useState<{ label: string; count: number; value: number; color: string }[]>([])
  const [isMobile,         setIsMobile]         = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { fetchDashboardData() }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data: userProfile } = await supabase
        .from('users').select('*, organisations(*)')
        .eq('auth_id', authUser.id).single()

      if (!userProfile) return

      const orgId    = userProfile.organisation_id
      const fullName = userProfile.name || ''
      setFirstName(fullName.split(' ')[0] || 'there')
      setOrgName((userProfile.organisations as any)?.name || 'your organisation')

      const [contactsRes, leadsRes, tasksRes, stagesRes, campaignsRes, messagesRes] = await Promise.all([
        supabase.from('contacts').select('id, created_at').eq('organisation_id', orgId),
        supabase.from('leads').select('id, value, stage_id, created_at, converted_at').eq('organisation_id', orgId),
        supabase.from('tasks').select('*').eq('organisation_id', orgId),
        supabase.from('pipeline_stages').select('id, label, color').eq('organisation_id', orgId),
        supabase.from('campaigns').select('id, sent, opened').eq('organisation_id', orgId),
        supabase.from('messages').select('id, read, direction').eq('organisation_id', orgId),
      ])

      const contacts  = contactsRes.data  || []
      const leads     = leadsRes.data     || []
      const tasks     = tasksRes.data     || []
      const stages    = stagesRes.data    || []
      const campaigns = campaignsRes.data || []
      const msgs      = messagesRes.data  || []

      const convertedLeads      = leads.filter(l => l.converted_at)
      const conversionRate      = leads.length > 0 ? Math.round((convertedLeads.length / leads.length) * 100) : 0
      const totalRevenue        = convertedLeads.reduce((s, l) => s + (l.value || 0), 0)
      const tasksDueToday       = tasks.filter(t => t.due_date === 'Today' && !t.done).length
      const unreadMessages      = msgs.filter(m => !m.read && m.direction === 'inbound').length
      const totalCampaignsSent  = campaigns.reduce((s, c) => s + (c.sent || 0), 0)
      const weekAgo             = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const newContactsThisWeek = contacts.filter(c => new Date(c.created_at) > weekAgo).length

      setStats([
        { label: 'Total Contacts',  value: contacts.length,                           change: `+${newContactsThisWeek} this week`,        color: '#818cf8', icon: <Users      size={16} /> },
        { label: 'Active Leads',    value: leads.length,                              change: `${conversionRate}% conversion rate`,        color: '#38bdf8', icon: <TrendingUp size={16} /> },
        { label: 'Revenue (KES)',   value: `${(totalRevenue / 1000).toFixed(0)}K`,    change: `${convertedLeads.length} deals closed`,     color: '#00ff88', icon: <DollarSign size={16} /> },
        { label: 'Tasks Due Today', value: tasksDueToday,                             change: `${tasks.filter(t => t.done).length} done`,  color: '#fbbf24', icon: <CheckSquare size={16} /> },
        { label: 'Unread Messages', value: unreadMessages,                            change: `${msgs.length} total messages`,             color: '#f97316', icon: <MessageSquare size={16} /> },
        { label: 'Campaigns Sent',  value: totalCampaignsSent,                        change: `${campaigns.length} campaigns`,             color: '#a78bfa', icon: <Megaphone  size={16} /> },
      ])

      const { data: recentLeadsData } = await supabase
        .from('leads')
        .select('*, contacts(name, company), pipeline_stages(label, color)')
        .eq('organisation_id', orgId)
        .order('created_at', { ascending: false })
        .limit(6)

      setRecentLeads((recentLeadsData || []).map((l: any) => ({
        id:         l.id,
        name:       l.contacts?.name    || 'Unknown',
        company:    l.contacts?.company || '',
        value:      l.value             || 0,
        stage:      l.pipeline_stages?.label || 'Unknown',
        stageColor: l.pipeline_stages?.color || '#818cf8',
        time:       timeAgo(l.created_at),
      })))

      setTodayTasks(
        tasks.filter(t => t.due_date === 'Today' && !t.done).slice(0, 5).map(t => ({
          id:         t.id,
          title:      t.title,
          priority:   t.priority    || 'medium',
          dueDate:    t.due_date    || '',
          assignedTo: t.assigned_to || '',
          done:       t.done        || false,
        }))
      )

      setPipelineOverview(
        stages.map(stage => ({
          label: stage.label,
          color: stage.color,
          count: leads.filter(l => l.stage_id === stage.id).length,
          value: leads.filter(l => l.stage_id === stage.id).reduce((s, l) => s + (l.value || 0), 0),
        }))
      )

    } catch (err) {
      console.error('Error fetching dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleTask = async (id: string) => {
    setTodayTasks(prev => prev.map(t => t.id === id ? { ...t, done: true } : t))
    await supabase.from('tasks').update({ done: true }).eq('id', id)
    setTimeout(() => setTodayTasks(prev => prev.filter(t => t.id !== id)), 600)
  }

  const card = {
    background: 'rgba(10,20,10,0.8)',
    border: '0.5px solid rgba(0,255,136,0.1)',
    borderRadius: '16px',
    padding: '20px',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080f08', color: 'white' }}>
      <Sidebar />

      <div style={{
        marginLeft: isMobile ? 0 : '240px',
        padding: isMobile ? '72px 16px 24px' : '32px',
        overflowY: 'auto',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '12px',
          marginBottom: '28px',
        }}>
          <div>
            <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: 'white', margin: 0 }}>
              Hey, {firstName}
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
              {loading ? 'Loading your dashboard...' : `Here's what's happening at ${orgName} today`}
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            style={{
              padding: '8px 16px', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer', fontSize: '12px', fontWeight: 500,
              width: isMobile ? '100%' : 'auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Loading dashboard...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* ── Stats Grid ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '24px',
            }}>
              {stats.map(stat => (
                <div
                  key={stat.label}
                  style={{ ...card, transition: 'border 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.border = '0.5px solid rgba(0,255,136,0.25)'}
                  onMouseLeave={e => e.currentTarget.style.border = '0.5px solid rgba(0,255,136,0.1)'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)' }}>
                      {stat.label}
                    </div>
                    {/* Icon in a coloured circle */}
                    <div style={{
                      width: 30, height: 30, borderRadius: '8px',
                      background: `${stat.color}18`,
                      border: `1px solid ${stat.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: stat.color,
                    }}>
                      {stat.icon}
                    </div>
                  </div>
                  <div style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 700, color: stat.color, marginBottom: '6px' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                    {stat.change}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Main grid ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
              gap: '16px',
            }}>

              {/* Recent Leads */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart2 size={15} color='rgba(255,255,255,0.5)' />
                    <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'white', margin: 0 }}>Recent Leads</h2>
                  </div>
                  <a href="/pipeline" style={{ fontSize: '12px', color: '#00ff88', textDecoration: 'none' }}>View all</a>
                </div>

                {recentLeads.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center' }}>
                    <BarChart2 size={28} color='rgba(255,255,255,0.15)' style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>No leads yet</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>Add leads from the Pipeline page</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recentLeads.map(lead => (
                      <div
                        key={lead.id}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: '8px' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0, background: `${lead.stageColor}15`, color: lead.stageColor }}>
                            {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{lead.company}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', fontWeight: 600, background: `${lead.stageColor}15`, color: lead.stageColor }}>
                            {lead.stage}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#00ff88' }}>
                            KES {lead.value.toLocaleString()}
                          </span>
                          {!isMobile && (
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>{lead.time}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Tasks Today */}
                <div style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckSquare size={15} color='rgba(255,255,255,0.5)' />
                      <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'white', margin: 0 }}>Tasks Today</h2>
                    </div>
                    <a href="/tasks" style={{ fontSize: '12px', color: '#00ff88', textDecoration: 'none' }}>View all</a>
                  </div>

                  {todayTasks.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center' }}>
                      <CheckCircle size={24} color='rgba(255,255,255,0.15)' style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No tasks due today</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {todayTasks.map(task => (
                        <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
                          <button
                            onClick={() => toggleTask(task.id)}
                            style={{ marginTop: '1px', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: priorityColors[task.priority] || '#00ff88', flexShrink: 0 }}
                          >
                            <Circle size={16} />
                          </button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                            <div style={{ fontSize: '11px', marginTop: '2px', color: priorityColors[task.priority] || '#00ff88', textTransform: 'capitalize' }}>{task.priority} priority</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pipeline Overview */}
                <div style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingUp size={15} color='rgba(255,255,255,0.5)' />
                      <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'white', margin: 0 }}>Pipeline</h2>
                    </div>
                    <a href="/pipeline" style={{ fontSize: '12px', color: '#00ff88', textDecoration: 'none' }}>View</a>
                  </div>

                  {pipelineOverview.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No pipeline data yet</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {pipelineOverview.map((stage, i) => {
                        const maxCount = Math.max(...pipelineOverview.map(s => s.count), 1)
                        return (
                          <div key={`${stage.label}-${i}`}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                                <span style={{ fontSize: '12px', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>{stage.label}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: stage.color }}>{stage.count}</span>
                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>KES {(stage.value / 1000).toFixed(0)}K</span>
                              </div>
                            </div>
                            <div style={{ height: 6, borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: '3px', width: `${(stage.count / maxCount) * 100}%`, background: stage.color, transition: 'width 0.5s ease' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}