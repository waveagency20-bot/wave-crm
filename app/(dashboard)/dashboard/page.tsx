'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/sidebar'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/auth'

type Stat = {
  label: string
  value: string | number
  change: string
  color: string
  icon: string
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

const priorityColors: Record<string, string> = {
  high: '#ff6b6b', medium: '#fbbf24', low: '#00ff88',
}

const timeAgo = (date: string) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [stats, setStats] = useState<Stat[]>([])
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([])
  const [todayTasks, setTodayTasks] = useState<Task[]>([])
  const [pipelineOverview, setPipelineOverview] = useState<{
    label: string
    count: number
    value: number
    color: string
  }[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data: userProfile } = await supabase
        .from('users')
        .select('*, organisations(*)')
        .eq('auth_id', authUser.id)
        .single()

      if (!userProfile) return

      const orgId = userProfile.organisation_id
      const fullName = userProfile.name || ''
      setFirstName(fullName.split(' ')[0] || 'there')
      setOrgName((userProfile.organisations as any)?.name || 'your organisation')

      // Run all queries in parallel
      const [
        contactsRes,
        leadsRes,
        tasksRes,
        stagesRes,
        campaignsRes,
        messagesRes,
      ] = await Promise.all([
        supabase.from('contacts').select('id, created_at').eq('organisation_id', orgId),
        supabase.from('leads').select('id, value, stage_id, created_at, converted_at').eq('organisation_id', orgId),
        supabase.from('tasks').select('*').eq('organisation_id', orgId),
        supabase.from('pipeline_stages').select('id, label, color').eq('organisation_id', orgId),
        supabase.from('campaigns').select('id, sent, opened').eq('organisation_id', orgId),
        supabase.from('messages').select('id, read, direction').eq('organisation_id', orgId),
      ])

      const contacts = contactsRes.data || []
      const leads = leadsRes.data || []
      const tasks = tasksRes.data || []
      const stages = stagesRes.data || []
      const campaigns = campaignsRes.data || []
      const msgs = messagesRes.data || []

      // Calculate stats
      const totalContacts = contacts.length
      const totalLeads = leads.length
      const convertedLeads = leads.filter(l => l.converted_at)
      const conversionRate = totalLeads > 0 ? Math.round((convertedLeads.length / totalLeads) * 100) : 0
      const totalRevenue = convertedLeads.reduce((s, l) => s + (l.value || 0), 0)
      const tasksDueToday = tasks.filter(t => t.due_date === 'Today' && !t.done).length
      const unreadMessages = msgs.filter(m => !m.read && m.direction === 'inbound').length
      const totalCampaignsSent = campaigns.reduce((s, c) => s + (c.sent || 0), 0)

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const newContactsThisWeek = contacts.filter(c => new Date(c.created_at) > weekAgo).length

      setStats([
        { label: 'Total Contacts', value: totalContacts, change: `+${newContactsThisWeek} this week`, color: '#818cf8', icon: '👥' },
        { label: 'Active Leads', value: totalLeads, change: `${conversionRate}% conversion rate`, color: '#38bdf8', icon: '📊' },
        { label: 'Revenue (KES)', value: `${(totalRevenue / 1000).toFixed(0)}K`, change: `${convertedLeads.length} deals closed`, color: '#00ff88', icon: '💰' },
        { label: 'Tasks Due Today', value: tasksDueToday, change: `${tasks.filter(t => t.done).length} completed`, color: '#fbbf24', icon: '✓' },
        { label: 'Unread Messages', value: unreadMessages, change: `${msgs.length} total messages`, color: '#f97316', icon: '💬' },
        { label: 'Campaigns Sent', value: totalCampaignsSent, change: `${campaigns.length} campaigns`, color: '#a78bfa', icon: '📣' },
      ])

      // Recent leads
      const { data: recentLeadsData } = await supabase
        .from('leads')
        .select('*, contacts(name, company), pipeline_stages(label, color)')
        .eq('organisation_id', orgId)
        .order('created_at', { ascending: false })
        .limit(6)

      setRecentLeads((recentLeadsData || []).map((l: any) => ({
        id: l.id,
        name: l.contacts?.name || 'Unknown',
        company: l.contacts?.company || '',
        value: l.value || 0,
        stage: l.pipeline_stages?.label || 'Unknown',
        stageColor: l.pipeline_stages?.color || '#818cf8',
        time: timeAgo(l.created_at),
      })))

      // Today's tasks
      setTodayTasks(
        tasks
          .filter(t => t.due_date === 'Today' && !t.done)
          .slice(0, 5)
          .map(t => ({
            id: t.id,
            title: t.title,
            priority: t.priority || 'medium',
            dueDate: t.due_date || '',
            assignedTo: t.assigned_to || '',
            done: t.done || false,
          }))
      )

      // Pipeline overview
      setPipelineOverview(
        stages.map(stage => ({
          label: stage.label,
          color: stage.color,
          count: leads.filter(l => l.stage_id === stage.id).length,
          value: leads
            .filter(l => l.stage_id === stage.id)
            .reduce((s, l) => s + (l.value || 0), 0),
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

  return (
    <div className="min-h-screen flex" style={{ background: '#080f08', color: 'white' }}>
      <Sidebar />

      <div className="ml-60 flex-1 p-8 overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Hey, {firstName} 👋
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {loading
                ? 'Loading your dashboard...'
                : `Here's what's happening at ${orgName} today`}
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
            }}>
            ↻ Refresh
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>
              Loading dashboard...
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {stats.map(stat => (
                <div key={stat.label} className="rounded-2xl p-5 transition-all"
                  style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}
                  onMouseEnter={e => e.currentTarget.style.border = '0.5px solid rgba(0,255,136,0.25)'}
                  onMouseLeave={e => e.currentTarget.style.border = '0.5px solid rgba(0,255,136,0.1)'}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-xs uppercase tracking-wider"
                      style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {stat.label}
                    </div>
                    <span style={{ fontSize: '20px' }}>{stat.icon}</span>
                  </div>
                  <div className="text-3xl font-bold mb-2" style={{ color: stat.color }}>
                    {stat.value}
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {stat.change}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-6">

              {/* Recent Leads */}
              <div className="col-span-2 rounded-2xl p-5"
                style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-white">Recent Leads</h2>
                  <a href="/pipeline" className="text-xs"
                    style={{ color: '#00ff88', textDecoration: 'none' }}>
                    View all →
                  </a>
                </div>

                {recentLeads.length === 0 ? (
                  <div className="py-8 text-center">
                    <div style={{ fontSize: '32px', opacity: 0.2, marginBottom: '8px' }}>📊</div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>No leads yet</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>
                      Add leads from the Pipeline page
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentLeads.map(lead => (
                      <div key={lead.id}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: `${lead.stageColor}15`, color: lead.stageColor }}>
                            {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{lead.name}</div>
                            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                              {lead.company}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs px-2.5 py-1 rounded-lg font-medium"
                            style={{ background: `${lead.stageColor}15`, color: lead.stageColor }}>
                            {lead.stage}
                          </span>
                          <span className="text-sm font-bold" style={{ color: '#00ff88' }}>
                            KES {lead.value.toLocaleString()}
                          </span>
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                            {lead.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-6">

                {/* Tasks Today */}
                <div className="rounded-2xl p-5"
                  style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-white">Tasks Today</h2>
                    <a href="/tasks" className="text-xs"
                      style={{ color: '#00ff88', textDecoration: 'none' }}>
                      View all →
                    </a>
                  </div>

                  {todayTasks.length === 0 ? (
                    <div className="py-6 text-center">
                      <div style={{ fontSize: '28px', opacity: 0.2, marginBottom: '8px' }}>✓</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                        No tasks due today
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {todayTasks.map(task => (
                        <div key={task.id}
                          className="flex items-start gap-3 p-2.5 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <button
                            onClick={() => toggleTask(task.id)}
                            className="mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                            style={{
                              border: `1.5px solid ${priorityColors[task.priority] || '#00ff88'}`,
                              background: 'transparent',
                              cursor: 'pointer',
                            }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-white truncate">
                              {task.title}
                            </div>
                            <div className="text-xs mt-0.5"
                              style={{ color: priorityColors[task.priority] || '#00ff88' }}>
                              {task.priority} priority
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pipeline Overview */}
                <div className="rounded-2xl p-5"
                  style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-white">Pipeline</h2>
                    <a href="/pipeline" className="text-xs"
                      style={{ color: '#00ff88', textDecoration: 'none' }}>
                      View →
                    </a>
                  </div>

                  {pipelineOverview.length === 0 ? (
                    <div className="py-6 text-center">
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                        No pipeline data yet
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pipelineOverview.map((stage, i) => {
  const maxCount = Math.max(...pipelineOverview.map(s => s.count), 1)
  return (
    <div key={`${stage.label}-${i}`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ background: stage.color }} />
                                <span className="text-xs text-white truncate" style={{ maxWidth: '96px' }}>
                                  {stage.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold" style={{ color: stage.color }}>
                                  {stage.count}
                                </span>
                                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                  KES {(stage.value / 1000).toFixed(0)}K
                                </span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden"
                              style={{ background: 'rgba(255,255,255,0.06)' }}>
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${(stage.count / maxCount) * 100}%`,
                                  background: stage.color,
                                }} />
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