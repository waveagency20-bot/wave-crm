'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/sidebar'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/auth'

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
  id: t.id,
  title: t.title,
  description: t.description || '',
  assignedTo: t.assigned_to || '',
  relatedTo: t.related_contact || '',
  dueDate: t.due_date || '',
  dueTime: t.due_time || '',
  priority: t.priority === 'high' ? 'High' : t.priority === 'low' ? 'Low' : 'Medium',
  done: t.done || false,
  tags: t.tags || [],
})

export default function TasksPage() {
  const { user, isAdmin, isManager, isAgent } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string>('')
  const [userFullName, setUserFullName] = useState<string>('')
  const [filter, setFilter] = useState<'All' | 'Today' | 'Upcoming' | 'Done'>('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchTasks()
  }, [user])

  // Realtime subscription
  useEffect(() => {
    if (!orgId) return

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const t = payload.new as any
            if (t.organisation_id !== orgId) return

            // Agents only see their own tasks
            if (isAgent && t.assigned_to !== userFullName) return

            setTasks(prev => {
              if (prev.find(task => task.id === t.id)) return prev
              return [mapTask(t), ...prev]
            })
          }

          if (payload.eventType === 'UPDATE') {
            const t = payload.new as any
            if (t.organisation_id !== orgId) return
            setTasks(prev => prev.map(task =>
              task.id === t.id ? mapTask(t) : task
            ))
          }

          if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(task => task.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orgId, isAgent, userFullName])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data: userProfile } = await supabase
        .from('users')
        .select('organisation_id, name, role')
        .eq('auth_id', authUser.id)
        .single()

      if (!userProfile) return
      setOrgId(userProfile.organisation_id)
      setUserFullName(userProfile.name || '')

      // Fetch team members for assignee dropdown
      const { data: teamData } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('organisation_id', userProfile.organisation_id)
        .eq('status', 'active')
        .order('name')

      setTeamMembers(teamData || [])

      // Build query
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('organisation_id', userProfile.organisation_id)
        .order('created_at', { ascending: false })

      // Agents only see tasks assigned to them
      if (userProfile.role === 'agent') {
        query = query.eq('assigned_to', userProfile.name)
      }

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
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.relatedTo.toLowerCase().includes(search.toLowerCase()) ||
      t.assignedTo.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'All' ? true :
      filter === 'Done' ? t.done :
      filter === 'Today' ? t.dueDate === 'Today' && !t.done :
      filter === 'Upcoming' ? t.dueDate !== 'Today' && !t.done : true
    const matchPriority = priorityFilter === 'All' || t.priority === priorityFilter
    return matchSearch && matchFilter && matchPriority
  })

  const toggleDone = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    if (isAgent && task.done) return // Agents cannot uncheck
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
    if (!form.title) newErrors.title = 'Title is required'
    if (!form.assignedTo) newErrors.assignedTo = 'Please assign this task to a team member'
    if (!form.dueDate) newErrors.dueDate = 'Due date is required'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          organisation_id: orgId,
          title: form.title,
          description: form.description,
          assigned_to: form.assignedTo,
          related_contact: form.relatedTo,
          due_date: form.dueDate,
          due_time: form.dueTime,
          priority: form.priority.toLowerCase(),
          done: false,
          tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        })
        .select()
        .single()

      if (error) throw error

      setTasks(prev => [mapTask(data), ...prev])
      setForm(emptyForm)
      setErrors({})
      setSubmitting(false)
      setDrawerOpen(false)

    } catch (err: any) {
      console.error('Error saving task:', err)
      alert(err.message || 'Failed to save task')
      setSubmitting(false)
    }
  }

  const todayCount = tasks.filter(t => t.dueDate === 'Today' && !t.done).length
  const doneCount = tasks.filter(t => t.done).length
  const highCount = tasks.filter(t => t.priority === 'High' && !t.done).length

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
            <h1 className="text-2xl font-bold text-white">Tasks</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {loading ? 'Loading...' : isAgent
                ? `${tasks.filter(t => !t.done).length} tasks assigned to you`
                : `${todayCount} due today · ${highCount} high priority · ${doneCount} completed`}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Live indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
              <span style={{ fontSize: '11px', color: '#00ff88', fontWeight: 600 }}>Live</span>
            </div>
            {/* Only admin and manager can create tasks */}
            {(isAdmin || isManager) && (
              <button
                onClick={() => { setForm(emptyForm); setErrors({}); setDrawerOpen(true) }}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(0,255,136,0.15)', border: '0.5px solid rgba(0,255,136,0.3)', color: '#00ff88' }}>
                + Add Task
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: isAgent ? 'My Tasks' : 'Due Today', value: isAgent ? tasks.filter(t => !t.done).length : todayCount, color: '#fbbf24' },
            { label: 'High Priority', value: highCount, color: '#ff6b6b' },
            { label: 'Total Active', value: tasks.filter(t => !t.done).length, color: '#38bdf8' },
            { label: 'Completed', value: doneCount, color: '#00ff88' },
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
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: 'rgba(255,255,255,0.3)' }}>🔍</span>
            <input type="text" placeholder="Search tasks..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
          </div>
          <div className="flex items-center gap-2">
            {(['All', 'Today', 'Upcoming', 'Done'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: filter === f ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)',
                  border: filter === f ? '0.5px solid rgba(0,255,136,0.3)' : '0.5px solid rgba(255,255,255,0.08)',
                  color: filter === f ? '#00ff88' : 'rgba(255,255,255,0.45)',
                }}>{f}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {['All', 'High', 'Medium', 'Low'].map(p => (
              <button key={p} onClick={() => setPriorityFilter(p)}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: priorityFilter === p ? `${priorityBg[p] || 'rgba(0,255,136,0.15)'}` : 'rgba(255,255,255,0.05)',
                  border: priorityFilter === p ? `0.5px solid ${priorityColors[p] || 'rgba(0,255,136,0.3)'}40` : '0.5px solid rgba(255,255,255,0.08)',
                  color: priorityFilter === p ? (priorityColors[p] || '#00ff88') : 'rgba(255,255,255,0.45)',
                }}>{p}</button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Loading tasks...</div>
          </div>
        )}

        {/* Tasks List */}
        {!loading && (
          <div className="space-y-3">
            {filtered.map(task => (
              <div key={task.id}
                className="rounded-2xl p-5 transition-all"
                style={{
                  background: task.done ? 'rgba(10,20,10,0.4)' : 'rgba(10,20,10,0.8)',
                  border: task.done ? '0.5px solid rgba(255,255,255,0.04)' : '0.5px solid rgba(0,255,136,0.1)',
                  opacity: task.done ? 0.6 : 1,
                }}
                onMouseEnter={e => { if (!task.done) e.currentTarget.style.border = '0.5px solid rgba(0,255,136,0.25)' }}
                onMouseLeave={e => { if (!task.done) e.currentTarget.style.border = '0.5px solid rgba(0,255,136,0.1)' }}>

                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleDone(task.id)}
                    className="mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: task.done ? 'rgba(0,255,136,0.25)' : 'transparent',
                      border: `1.5px solid ${task.done ? '#00ff88' : 'rgba(255,255,255,0.25)'}`,
                      cursor: isAgent && task.done ? 'default' : 'pointer',
                    }}>
                    {task.done && <span style={{ color: '#00ff88', fontSize: '11px' }}>✓</span>}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <span className="text-sm font-semibold text-white"
                          style={{ textDecoration: task.done ? 'line-through' : 'none', opacity: task.done ? 0.5 : 1 }}>
                          {task.title}
                        </span>
                        {task.description && (
                          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            {task.description}
                          </p>
                        )}
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-lg font-semibold flex-shrink-0"
                        style={{ background: priorityBg[task.priority], color: priorityColors[task.priority] }}>
                        {task.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: task.dueDate === 'Today' && !task.done ? '#fbbf24' : 'rgba(255,255,255,0.3)', fontSize: '12px' }}>🕐</span>
                        <span className="text-xs font-medium"
                          style={{ color: task.dueDate === 'Today' && !task.done ? '#fbbf24' : 'rgba(255,255,255,0.35)' }}>
                          {task.dueDate} {task.dueTime && `· ${task.dueTime}`}
                        </span>
                      </div>
                      {task.relatedTo && (
                        <div className="flex items-center gap-1.5">
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>👤</span>
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{task.relatedTo}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center font-bold"
                          style={{ background: 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '9px' }}>
                          {task.assignedTo.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{task.assignedTo}</span>
                      </div>
                      {task.tags.map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-md"
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Delete — only admin and manager */}
                  {(isAdmin || isManager) && (
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: 'rgba(255,107,107,0.08)', color: 'rgba(255,107,107,0.4)', border: '0.5px solid rgba(255,107,107,0.1)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.2)'; e.currentTarget.style.color = '#ff6b6b' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.08)'; e.currentTarget.style.color = 'rgba(255,107,107,0.4)' }}>
                      🗑
                    </button>
                  )}
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="py-16 text-center rounded-2xl"
                style={{ background: 'rgba(10,20,10,0.4)', border: '0.5px solid rgba(255,255,255,0.05)' }}>
                <div className="text-4xl mb-3">✓</div>
                <div className="text-sm font-medium text-white">
                  {isAgent ? 'No tasks assigned to you yet' : 'No tasks found'}
                </div>
                <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {isAgent
                    ? 'Your admin or manager will assign tasks here'
                    : filter === 'Done' ? 'No completed tasks yet' : 'Add a new task above'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overlay */}
      {drawerOpen && (
        <div onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
      )}

      {/* Add Task Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '440px',
        background: '#0a140a', borderLeft: '1px solid rgba(0,255,136,0.12)',
        zIndex: 300, display: 'flex', flexDirection: 'column',
        transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: drawerOpen ? '-20px 0 60px rgba(0,0,0,0.5)' : 'none',
      }}>
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(0,255,136,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', margin: 0 }}>Add New Task</h2>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>Assign a task to a team member</p>
          </div>
          <button onClick={() => setDrawerOpen(false)} style={{ width: 32, height: 32, borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                <button key={p} onClick={() => setForm({ ...form, priority: p })} style={{
                  flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  background: form.priority === p ? priorityBg[p] : 'rgba(255,255,255,0.04)',
                  border: form.priority === p ? `1px solid ${priorityColors[p]}40` : '1px solid rgba(255,255,255,0.08)',
                  color: form.priority === p ? priorityColors[p] : 'rgba(255,255,255,0.4)',
                }}>{p}</button>
              ))}
            </div>
          </div>

          {/* Assign To — dropdown of real team members */}
          <div>
            <label style={labelStyle}>Assign To *</label>
            <select
              style={{ ...inputStyle, borderColor: errors.assignedTo ? '#ff6b6b' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}
              value={form.assignedTo}
              onChange={e => { setForm({ ...form, assignedTo: e.target.value }); setErrors({ ...errors, assignedTo: '' }) }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = errors.assignedTo ? '#ff6b6b' : 'rgba(255,255,255,0.1)'}>
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

        <div style={{ padding: '20px 28px', borderTop: '1px solid rgba(0,255,136,0.08)', display: 'flex', gap: '10px' }}>
          <button onClick={() => setDrawerOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: 'rgba(0,255,136,0.15)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Saving...' : '+ Save Task'}
          </button>
        </div>
      </div>
    </div>
  )
}