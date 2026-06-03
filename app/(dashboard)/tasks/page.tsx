'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/sidebar'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/auth'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Task = {
  id: string
  title: string
  description: string
  assignedTo: string
  relatedTo: string
  dueDate: string
  dueTime: string
  priority: 'High' | 'Medium' | 'Low'
  done: boolean
  tags: string[]
}

type TeamMember = {
  id: string
  name: string
  role: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const priorityColors: Record<string, string> = {
  High: '#ff6b6b', Medium: '#fbbf24', Low: '#00ff88',
}

const priorityBg: Record<string, string> = {
  High: 'rgba(255,107,107,0.15)', Medium: 'rgba(251,191,36,0.15)', Low: 'rgba(0,255,136,0.12)',
}

const emptyForm = {
  title: '', description: '', assignedTo: '', relatedTo: '',
  dueDate: '', dueTime: '', priority: 'Medium' as 'High' | 'Medium' | 'Low', tags: '',
}

const mapTask = (t: any): Task => ({
  id:          t.id,
  title:       t.title,
  description: t.description   || '',
  assignedTo:  t.assigned_to   || '',
  relatedTo:   t.related_contact || '',
  dueDate:     t.due_date      || '',
  dueTime:     t.due_time      || '',
  priority:    t.priority === 'high' ? 'High' : t.priority === 'low' ? 'Low' : 'Medium',
  done:        t.done          || false,
  tags:        t.tags          || [],
})

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function TasksPage() {
  const { user, isAdmin, isManager, isAgent } = useAuth()

  const [tasks,         setTasks]         = useState<Task[]>([])
  const [teamMembers,   setTeamMembers]   = useState<TeamMember[]>([])
  const [loading,       setLoading]       = useState(true)
  const [orgId,         setOrgId]         = useState<string>('')
  const [userFullName,  setUserFullName]  = useState<string>('')
  const [filter,        setFilter]        = useState<'All' | 'Today' | 'Upcoming' | 'Done'>('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [drawerOpen,    setDrawerOpen]    = useState(false)
  const [form,          setForm]          = useState(emptyForm)
  const [errors,        setErrors]        = useState<Record<string, string>>({})
  const [submitting,    setSubmitting]    = useState(false)
  const [search,        setSearch]        = useState('')
  const [isMobile,      setIsMobile]      = useState(false)

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { fetchTasks() }, [user])

  // Realtime subscription
  useEffect(() => {
    if (!orgId) return

    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const t = payload.new as any
          if (t.organisation_id !== orgId) return
          if (isAgent && t.assigned_to !== userFullName) return
          setTasks(prev => { if (prev.find(task => task.id === t.id)) return prev; return [mapTask(t), ...prev] })
        }
        if (payload.eventType === 'UPDATE') {
          const t = payload.new as any
          if (t.organisation_id !== orgId) return
          setTasks(prev => prev.map(task => task.id === t.id ? mapTask(t) : task))
        }
        if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(task => task.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orgId, isAgent, userFullName])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data: userProfile } = await supabase
        .from('users').select('organisation_id, name, role').eq('auth_id', authUser.id).single()

      if (!userProfile) return
      setOrgId(userProfile.organisation_id)
      setUserFullName(userProfile.name || '')

      const { data: teamData } = await supabase
        .from('users').select('id, name, role')
        .eq('organisation_id', userProfile.organisation_id)
        .eq('status', 'active').order('name')

      setTeamMembers(teamData || [])

      let query = supabase
        .from('tasks').select('*')
        .eq('organisation_id', userProfile.organisation_id)
        .order('created_at', { ascending: false })

      if (userProfile.role === 'agent') query = query.eq('assigned_to', userProfile.name)

      const { data, error } = await query
      if (error) throw error

      setTasks(data.map(mapTask))
    } catch (err) {
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = tasks.filter(t => {
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase())      ||
      t.relatedTo.toLowerCase().includes(search.toLowerCase())  ||
      t.assignedTo.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'All'      ? true :
      filter === 'Done'     ? t.done :
      filter === 'Today'    ? t.dueDate === 'Today' && !t.done :
      filter === 'Upcoming' ? t.dueDate !== 'Today' && !t.done : true
    const matchPriority = priorityFilter === 'All' || t.priority === priorityFilter
    return matchSearch && matchFilter && matchPriority
  })

  const toggleDone = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    if (isAgent && task.done) return
    const newDone = !task.done
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: newDone } : t))
    await supabase.from('tasks').update({ done: newDone }).eq('id', id)
  }

  const deleteTask = async (id: string) => {
    if (isAgent) return
    if (!confirm('Delete this task?')) return
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}
    if (!form.title)      newErrors.title      = 'Title is required'
    if (!form.assignedTo) newErrors.assignedTo = 'Please assign this task'
    if (!form.dueDate)    newErrors.dueDate     = 'Due date is required'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          organisation_id: orgId,
          title:           form.title,
          description:     form.description,
          assigned_to:     form.assignedTo,
          related_contact: form.relatedTo,
          due_date:        form.dueDate,
          due_time:        form.dueTime,
          priority:        form.priority.toLowerCase(),
          done:            false,
          tags:            form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        })
        .select().single()

      if (error) throw error

      setTasks(prev => [mapTask(data), ...prev])
      setForm(emptyForm)
      setErrors({})
      setSubmitting(false)
      setDrawerOpen(false)
    } catch (err: any) {
      alert(err.message || 'Failed to save task')
      setSubmitting(false)
    }
  }

  const todayCount = tasks.filter(t => t.dueDate === 'Today' && !t.done).length
  const doneCount  = tasks.filter(t => t.done).length
  const highCount  = tasks.filter(t => t.priority === 'High' && !t.done).length

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

  const drawerWidth = isMobile ? '100%' : '440px'

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
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '12px', marginBottom: '24px',
        }}>
          <div>
            <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: 'white', margin: 0 }}>Tasks</h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
              {loading ? 'Loading...' : isAgent
                ? `${tasks.filter(t => !t.done).length} tasks assigned to you`
                : `${todayCount} due today · ${highCount} high priority · ${doneCount} completed`}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '8px', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
              <span style={{ fontSize: '11px', color: '#00ff88', fontWeight: 600 }}>Live</span>
            </div>
            {(isAdmin || isManager) && (
              <button
                onClick={() => { setForm(emptyForm); setErrors({}); setDrawerOpen(true) }}
                style={{ flex: isMobile ? 1 : 'none', padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: 'rgba(0,255,136,0.15)', border: '0.5px solid rgba(0,255,136,0.3)', color: '#00ff88' }}
              >
                + Add Task
              </button>
            )}
          </div>
        </div>

        {/* ── Stats — 2 cols on mobile, 4 on desktop ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: '12px', marginBottom: '20px',
        }}>
          {[
            { label: isAgent ? 'My Tasks' : 'Due Today', value: isAgent ? tasks.filter(t => !t.done).length : todayCount, color: '#fbbf24' },
            { label: 'High Priority', value: highCount,                           color: '#ff6b6b' },
            { label: 'Total Active',  value: tasks.filter(t => !t.done).length,   color: '#38bdf8' },
            { label: 'Completed',     value: doneCount,                           color: '#00ff88' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)', borderRadius: '16px', padding: '16px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 700, color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters — scrollable on mobile ── */}
        <div style={{ marginBottom: '20px' }}>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>🔍</span>
            <input
              type="text" placeholder="Search tasks..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '36px' }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          {/* Filter + priority buttons — scrollable on mobile */}
          <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
            <div style={{ display: 'flex', gap: '6px', minWidth: 'max-content' }}>
              {(['All', 'Today', 'Upcoming', 'Done'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' as const, background: filter === f ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)', border: filter === f ? '0.5px solid rgba(0,255,136,0.3)' : '0.5px solid rgba(255,255,255,0.08)', color: filter === f ? '#00ff88' : 'rgba(255,255,255,0.45)' }}>
                  {f}
                </button>
              ))}
              <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
              {['All', 'High', 'Medium', 'Low'].map(p => (
                <button key={p} onClick={() => setPriorityFilter(p)}
                  style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' as const, background: priorityFilter === p ? (priorityBg[p] || 'rgba(0,255,136,0.15)') : 'rgba(255,255,255,0.05)', border: priorityFilter === p ? `0.5px solid ${priorityColors[p] || 'rgba(0,255,136,0.3)'}40` : '0.5px solid rgba(255,255,255,0.08)', color: priorityFilter === p ? (priorityColors[p] || '#00ff88') : 'rgba(255,255,255,0.45)' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Loading tasks...</span>
          </div>
        )}

        {/* ── Task list ── */}
        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(task => (
              <div
                key={task.id}
                style={{
                  background: task.done ? 'rgba(10,20,10,0.4)' : 'rgba(10,20,10,0.8)',
                  border:     task.done ? '0.5px solid rgba(255,255,255,0.04)' : '0.5px solid rgba(0,255,136,0.1)',
                  borderRadius: '16px',
                  padding: isMobile ? '14px' : '20px',
                  opacity: task.done ? 0.6 : 1,
                  transition: 'border 0.15s',
                }}
                onMouseEnter={e => { if (!task.done) e.currentTarget.style.border = '0.5px solid rgba(0,255,136,0.25)' }}
                onMouseLeave={e => { if (!task.done) e.currentTarget.style.border = '0.5px solid rgba(0,255,136,0.1)' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>

                  {/* Checkbox — larger touch target on mobile */}
                  <button
                    onClick={() => toggleDone(task.id)}
                    style={{
                      marginTop: '2px',
                      width:  isMobile ? 24 : 20,
                      height: isMobile ? 24 : 20,
                      borderRadius: '6px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'all 0.15s',
                      background: task.done ? 'rgba(0,255,136,0.25)' : 'transparent',
                      border: `1.5px solid ${task.done ? '#00ff88' : 'rgba(255,255,255,0.25)'}`,
                      cursor: isAgent && task.done ? 'default' : 'pointer',
                    }}
                  >
                    {task.done && <span style={{ color: '#00ff88', fontSize: '12px' }}>✓</span>}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: isMobile ? '14px' : '13px', fontWeight: 600, color: 'white', textDecoration: task.done ? 'line-through' : 'none', opacity: task.done ? 0.5 : 1 }}>
                          {task.title}
                        </span>
                        {task.description && (
                          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0', lineHeight: 1.5 }}>
                            {task.description}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', fontWeight: 600, background: priorityBg[task.priority], color: priorityColors[task.priority] }}>
                          {task.priority}
                        </span>
                        {(isAdmin || isManager) && (
                          <button
                            onClick={() => deleteTask(task.id)}
                            style={{ width: isMobile ? 30 : 26, height: isMobile ? 30 : 26, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,107,107,0.08)', color: 'rgba(255,107,107,0.4)', border: '0.5px solid rgba(255,107,107,0.1)', cursor: 'pointer', fontSize: '13px' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.2)'; e.currentTarget.style.color = '#ff6b6b' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.08)'; e.currentTarget.style.color = 'rgba(255,107,107,0.4)' }}
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Meta row — wraps on mobile */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '12px', color: task.dueDate === 'Today' && !task.done ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}>🕐</span>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: task.dueDate === 'Today' && !task.done ? '#fbbf24' : 'rgba(255,255,255,0.35)' }}>
                          {task.dueDate}{task.dueTime ? ` · ${task.dueTime}` : ''}
                        </span>
                      </div>

                      {task.relatedTo && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>👤</span>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{task.relatedTo}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, background: 'rgba(0,255,136,0.15)', color: '#00ff88' }}>
                          {task.assignedTo.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{task.assignedTo}</span>
                      </div>

                      {task.tags.map(tag => (
                        <span key={tag} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{ padding: '64px 24px', textAlign: 'center', borderRadius: '16px', background: 'rgba(10,20,10,0.4)', border: '0.5px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>✓</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>
                  {isAgent ? 'No tasks assigned to you yet' : 'No tasks found'}
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>
                  {isAgent
                    ? 'Your admin or manager will assign tasks here'
                    : filter === 'Done' ? 'No completed tasks yet' : 'Add a new task to get started'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Backdrop ── */}
      {drawerOpen && (
        <div onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
      )}

      {/* ── Add Task Drawer — full screen on mobile ── */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: drawerWidth,
        background: '#0a140a',
        borderLeft: isMobile ? 'none' : '1px solid rgba(0,255,136,0.12)',
        zIndex: 300, display: 'flex', flexDirection: 'column',
        transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: drawerOpen ? '-20px 0 60px rgba(0,0,0,0.5)' : 'none',
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(0,255,136,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'white', margin: 0 }}>Add New Task</h2>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>Assign a task to a team member</p>
          </div>
          <button onClick={() => setDrawerOpen(false)} style={{ width: 36, height: 36, borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div>
            <label style={labelStyle}>Task Title *</label>
            <input style={{ ...inputStyle, borderColor: errors.title ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
              placeholder="e.g. Follow up with John Kamau" value={form.title}
              onChange={e => { setForm({ ...form, title: e.target.value }); setErrors({ ...errors, title: '' }) }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = errors.title ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
            {errorText('title')}
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' as const }}
              placeholder="Add more details about this task..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
          </div>

          {/* Due date + time — stacked on mobile */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Due Date *</label>
              <input style={{ ...inputStyle, borderColor: errors.dueDate ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
                placeholder="e.g. Today, Tomorrow" value={form.dueDate}
                onChange={e => { setForm({ ...form, dueDate: e.target.value }); setErrors({ ...errors, dueDate: '' }) }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                onBlur={e => e.target.style.borderColor = errors.dueDate ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
              {errorText('dueDate')}
            </div>
            <div>
              <label style={labelStyle}>Due Time</label>
              <input style={inputStyle} placeholder="e.g. 2:00 PM" value={form.dueTime}
                onChange={e => setForm({ ...form, dueTime: e.target.value })}
                onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Priority</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['High', 'Medium', 'Low'] as const).map(p => (
                <button key={p} onClick={() => setForm({ ...form, priority: p })}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: form.priority === p ? priorityBg[p] : 'rgba(255,255,255,0.04)', border: form.priority === p ? `1px solid ${priorityColors[p]}40` : '1px solid rgba(255,255,255,0.08)', color: form.priority === p ? priorityColors[p] : 'rgba(255,255,255,0.4)' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Assign To *</label>
            <select
              style={{ ...inputStyle, borderColor: errors.assignedTo ? '#ff6b6b' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}
              value={form.assignedTo}
              onChange={e => { setForm({ ...form, assignedTo: e.target.value }); setErrors({ ...errors, assignedTo: '' }) }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = errors.assignedTo ? '#ff6b6b' : 'rgba(255,255,255,0.1)'}
            >
              <option value="" style={{ background: '#0a140a' }}>Select team member...</option>
              {teamMembers.map(member => (
                <option key={member.id} value={member.name} style={{ background: '#0a140a' }}>
                  {member.name} ({member.role})
                </option>
              ))}
            </select>
            {errorText('assignedTo')}
          </div>

          <div>
            <label style={labelStyle}>Related Contact</label>
            <input style={inputStyle} placeholder="e.g. John Kamau" value={form.relatedTo}
              onChange={e => setForm({ ...form, relatedTo: e.target.value })}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
          </div>

          <div>
            <label style={labelStyle}>Tags <span style={{ textTransform: 'none', fontWeight: 400 }}>(comma separated)</span></label>
            <input style={inputStyle} placeholder="Call, Follow-up, Demo" value={form.tags}
              onChange={e => setForm({ ...form, tags: e.target.value })}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(0,255,136,0.08)', display: 'flex', gap: '10px' }}>
          <button onClick={() => setDrawerOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: 'rgba(0,255,136,0.15)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Saving...' : '+ Save Task'}
          </button>
        </div>
      </div>
    </div>
  )
}