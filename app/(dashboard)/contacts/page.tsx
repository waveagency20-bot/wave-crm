'use client'

import { useState, useEffect, useRef } from 'react'
import Logo from '@/components/logo'
import Sidebar from '@/components/sidebar'
import { supabase } from '@/lib/supabase'

type Contact = {
  id: string
  name: string
  company: string
  email: string
  phone: string
  source: string
  tags: string[]
  assigned: string
  lastContact: string
}

const sourceIcons: Record<string, string> = {
  WhatsApp: '💬', 'Web Form': '🌐', Email: '📧', 'Social Media': '📱', Referral: '🤝', Import: '📂', manual: '✍️',
}

const sourceOptions = ['WhatsApp', 'Email', 'Web Form', 'Social Media', 'Referral']

const emptyForm = {
  name: '', company: '', email: '', phone: '',
  source: 'WhatsApp', assigned: '', tags: '',
}

const validateEmail = (email: string) => {
  if (!email) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

const validatePhone = (phone: string) => {
  if (!phone) return true
  const cleaned = phone.replace(/[\s\-()]/g, '')
  return /^(\+254|0)[17]\d{8}$/.test(cleaned)
}

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

const timeAgo = (date: string) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importStep, setImportStep] = useState<'upload' | 'preview'>('upload')
  const [importData, setImportData] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Load contacts from Supabase
  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
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

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('organisation_id', userProfile.organisation_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setContacts(data.map((c: any) => ({
        id: c.id,
        name: c.name,
        company: c.company || '',
        email: c.email || '',
        phone: c.phone || '',
        source: c.source || 'manual',
        tags: c.tags || [],
        assigned: c.assigned_to || '',
        lastContact: timeAgo(c.last_contact || c.created_at),
      })))
    } catch (err) {
      console.error('Error fetching contacts:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.assigned.toLowerCase().includes(search.toLowerCase())
  )

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const toggleAll = () =>
    setSelected(prev => prev.length === filtered.length ? [] : filtered.map(c => c.id))

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}
    if (!form.name) newErrors.name = 'Name is required'
    if (!form.company) newErrors.company = 'Company is required'
    if (!form.email) newErrors.email = 'Email is required'
    if (!form.assigned) newErrors.assigned = 'Please enter who this contact is assigned to'
    if (form.email && !validateEmail(form.email)) newErrors.email = 'Enter a valid email'
    if (form.phone && !validatePhone(form.phone)) newErrors.phone = 'Enter a valid Kenyan number e.g. 0712345678'

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('organisation_id, id')
        .eq('auth_id', user.id)
        .single()

      if (!userProfile) throw new Error('User profile not found')

      const { data, error } = await supabase
        .from('contacts')
        .insert({
          organisation_id: userProfile.organisation_id,
          name: form.name,
          company: form.company,
          email: form.email,
          phone: form.phone,
          source: form.source,
          assigned_to: form.assigned,
          tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          created_by: userProfile.id,
          last_contact: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      // Add to local state instantly
      setContacts(prev => [{
        id: data.id,
        name: data.name,
        company: data.company || '',
        email: data.email || '',
        phone: data.phone || '',
        source: data.source || 'manual',
        tags: data.tags || [],
        assigned: data.assigned_to || '',
        lastContact: 'Just now',
      }, ...prev])

      setForm(emptyForm)
      setErrors({})
      setSubmitting(false)
      setDrawerOpen(false)

    } catch (err: any) {
      console.error('Error saving contact:', err)
      alert(err.message || 'Failed to save contact')
      setSubmitting(false)
    }
  }

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`Delete ${ids.length} contact(s)? This cannot be undone.`)) return
    try {
      const { error } = await supabase.from('contacts').delete().in('id', ids)
      if (error) throw error
      setContacts(prev => prev.filter(c => !ids.includes(c.id)))
      setSelected([])
    } catch (err: any) {
      alert(err.message || 'Failed to delete contacts')
    }
  }

  const handleAssignBulk = async () => {
    const name = prompt('Assign to (enter full name):')
    if (!name) return
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ assigned_to: name })
        .in('id', selected)
      if (error) throw error
      setContacts(prev => prev.map(c => selected.includes(c.id) ? { ...c, assigned: name } : c))
      setSelected([])
    } catch (err: any) {
      alert(err.message || 'Failed to assign contacts')
    }
  }

  const handleTagBulk = async () => {
    const tag = prompt('Add tag:')
    if (!tag) return
    try {
      for (const id of selected) {
        const contact = contacts.find(c => c.id === id)
        if (!contact) continue
        const newTags = contact.tags.includes(tag.trim()) ? contact.tags : [...contact.tags, tag.trim()]
        await supabase.from('contacts').update({ tags: newTags }).eq('id', id)
      }
      setContacts(prev => prev.map(c =>
        selected.includes(c.id)
          ? { ...c, tags: c.tags.includes(tag.trim()) ? c.tags : [...c.tags, tag.trim()] }
          : c
      ))
      setSelected([])
    } catch (err: any) {
      alert(err.message || 'Failed to tag contacts')
    }
  }

  const handleExport = () => {
    const selectedContacts = contacts.filter(c => selected.includes(c.id))
    const csv = [
      'Name,Company,Email,Phone,Source,Assigned,Tags',
      ...selectedContacts.map(c =>
        `${c.name},${c.company},${c.email},${c.phone},${c.source},${c.assigned},"${c.tags.join(', ')}"`
      )
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'wave-crm-contacts.csv'
    a.click()
    URL.revokeObjectURL(url)
    setSelected([])
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split('\n').filter(Boolean)
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const parsed = lines.slice(1).map((line, i) => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        const get = (key: string) => values[headers.indexOf(key)] || ''
        return {
          name: get('name') || get('full name') || `Contact ${i + 1}`,
          company: get('company') || '',
          email: get('email') || '',
          phone: get('phone') || get('mobile') || '',
          assigned: get('assigned') || '',
        }
      }).filter(c => c.name)
      setImportData(parsed)
      setImportStep('preview')
    }
    reader.readAsText(file)
  }

  const handleImportConfirm = async () => {
    setImporting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('organisation_id, id')
        .eq('auth_id', user.id)
        .single()

      if (!userProfile) throw new Error('User profile not found')

      const inserts = importData.map(c => ({
        organisation_id: userProfile.organisation_id,
        name: c.name,
        company: c.company,
        email: c.email,
        phone: c.phone,
        source: 'Import',
        assigned_to: c.assigned || '',
        tags: ['Imported'],
        created_by: userProfile.id,
        last_contact: new Date().toISOString(),
      }))

      const { error } = await supabase.from('contacts').insert(inserts)
      if (error) throw error

      await fetchContacts()
      setImportData([])
      setImportStep('upload')
      setImporting(false)
      setImportOpen(false)
      if (fileRef.current) fileRef.current.value = ''

    } catch (err: any) {
      alert(err.message || 'Failed to import contacts')
      setImporting(false)
    }
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
            <h1 className="text-2xl font-bold text-white">Contacts & Leads</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {loading ? 'Loading...' : `${contacts.length} total contacts`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setImportOpen(true); setImportStep('upload') }}
              className="px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
              ↑ Import
            </button>
            <button
              onClick={() => { setForm(emptyForm); setErrors({}); setDrawerOpen(true) }}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(0,255,136,0.15)', border: '0.5px solid rgba(0,255,136,0.3)', color: '#00ff88' }}>
              + Add Contact
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: 'rgba(255,255,255,0.3)' }}>🔍</span>
            <input type="text" placeholder="Search contacts..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
          </div>
          <div className="flex items-center gap-1 rounded-lg p-1"
            style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            {(['table', 'cards'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className="px-3 py-1.5 rounded-md text-xs font-medium"
                style={{
                  background: viewMode === v ? 'rgba(0,255,136,0.15)' : 'transparent',
                  color: viewMode === v ? '#00ff88' : 'rgba(255,255,255,0.4)',
                }}>
                {v === 'table' ? '☰ Table' : '⊞ Cards'}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk actions */}
        {selected.length > 0 && (
          <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(0,255,136,0.08)', border: '0.5px solid rgba(0,255,136,0.2)' }}>
            <span className="text-sm font-medium" style={{ color: '#00ff88' }}>{selected.length} selected</span>
            <div className="flex items-center gap-2 ml-4">
              <button onClick={handleAssignBulk}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '0.5px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                Assign
              </button>
              <button onClick={handleTagBulk}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '0.5px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                Tag
              </button>
              <button onClick={handleExport}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '0.5px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                Export
              </button>
              <button onClick={() => handleDelete(selected)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(255,107,107,0.15)', color: '#ff6b6b', border: '0.5px solid rgba(255,107,107,0.2)', cursor: 'pointer' }}>
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Loading contacts...</div>
          </div>
        )}

        {/* Table View */}
        {!loading && viewMode === 'table' && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox"
                      checked={selected.length === filtered.length && filtered.length > 0}
                      onChange={toggleAll} />
                  </th>
                  {['Name', 'Source', 'Phone', 'Email', 'Tags', 'Assigned To', 'Last Contact', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider"
                      style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(contact => (
                  <tr key={contact.id} className="transition-all cursor-pointer"
                    style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,255,136,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(contact.id)}
                        onChange={() => toggleSelect(contact.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'rgba(0,255,136,0.12)', color: '#00ff88' }}>
                          {getInitials(contact.name)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{contact.name}</div>
                          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{contact.company}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {sourceIcons[contact.source] || '✍️'} {contact.source}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {contact.phone}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {contact.email}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-md"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88' }}>
                          {getInitials(contact.assigned || '?')}
                        </div>
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          {contact.assigned}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {contact.lastContact}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="text-xs px-2.5 py-1.5 rounded-lg"
                          style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '0.5px solid rgba(0,255,136,0.2)' }}>
                          View
                        </button>
                        <button
                          onClick={() => handleDelete([contact.id])}
                          className="text-xs px-2.5 py-1.5 rounded-lg"
                          style={{ background: 'rgba(255,107,107,0.08)', color: 'rgba(255,107,107,0.6)', border: '0.5px solid rgba(255,107,107,0.1)' }}>
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && !loading && (
              <div className="py-16 text-center">
                <div className="text-4xl mb-3">👥</div>
                <div className="text-sm font-medium text-white">No contacts yet</div>
                <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Add your first contact to get started
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cards View */}
        {!loading && viewMode === 'cards' && (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map(contact => (
              <div key={contact.id} className="rounded-2xl p-5 cursor-pointer transition-all"
                style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}
                onMouseEnter={e => (e.currentTarget.style.border = '0.5px solid rgba(0,255,136,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.border = '0.5px solid rgba(0,255,136,0.1)')}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: 'rgba(0,255,136,0.12)', color: '#00ff88' }}>
                      {getInitials(contact.name)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{contact.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{contact.company}</div>
                    </div>
                  </div>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {sourceIcons[contact.source] || '✍️'}
                  </span>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>📧 {contact.email}</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>📞 {contact.phone}</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>👤 {contact.assigned}</div>
                </div>
                <div className="flex flex-wrap gap-1 mb-4">
                  {contact.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-md"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3"
                  style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{contact.lastContact}</span>
                  <div className="flex gap-2">
                    <button className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '0.5px solid rgba(0,255,136,0.2)' }}>
                      View
                    </button>
                    <button onClick={() => handleDelete([contact.id])}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: 'rgba(255,107,107,0.08)', color: 'rgba(255,107,107,0.6)', border: '0.5px solid rgba(255,107,107,0.1)' }}>
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 py-16 text-center">
                <div className="text-4xl mb-3">👥</div>
                <div className="text-sm font-medium text-white">No contacts yet</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overlays */}
      {(drawerOpen || importOpen) && (
        <div onClick={() => { setDrawerOpen(false); setImportOpen(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
      )}

      {/* Add Contact Drawer */}
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
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', margin: 0 }}>Add New Contact</h2>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>Fill in the contact details below</p>
          </div>
          <button onClick={() => setDrawerOpen(false)} style={{ width: 32, height: 32, borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input style={{ ...inputStyle, borderColor: errors.name ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
                placeholder="John Kamau" value={form.name}
                onChange={e => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: '' }) }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                onBlur={e => e.target.style.borderColor = errors.name ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
              {errorText('name')}
            </div>
            <div>
              <label style={labelStyle}>Company *</label>
              <input style={{ ...inputStyle, borderColor: errors.company ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
                placeholder="Acme Ltd" value={form.company}
                onChange={e => { setForm({ ...form, company: e.target.value }); setErrors({ ...errors, company: '' }) }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                onBlur={e => e.target.style.borderColor = errors.company ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
              {errorText('company')}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Email Address *</label>
            <input style={{ ...inputStyle, borderColor: errors.email ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
              placeholder="john@company.com" type="email" value={form.email}
              onChange={e => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: '' }) }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = errors.email ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
            {errorText('email')}
          </div>

          <div>
            <label style={labelStyle}>Phone Number</label>
            <input style={{ ...inputStyle, borderColor: errors.phone ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
              placeholder="+254 7XX XXX XXX" value={form.phone}
              onChange={e => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: '' }) }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = errors.phone ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
            {errorText('phone')}
          </div>

          <div>
            <label style={labelStyle}>Lead Source</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {sourceOptions.map(s => (
                <button key={s} onClick={() => setForm({ ...form, source: s })} style={{
                  padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                  background: form.source === s ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.04)',
                  border: form.source === s ? '1px solid rgba(0,255,136,0.35)' : '1px solid rgba(255,255,255,0.08)',
                  color: form.source === s ? '#00ff88' : 'rgba(255,255,255,0.45)',
                }}>{sourceIcons[s]} {s}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Assigned To *</label>
            <input style={{ ...inputStyle, borderColor: errors.assigned ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
              placeholder="e.g. John Kariuki" value={form.assigned}
              onChange={e => { setForm({ ...form, assigned: e.target.value }); setErrors({ ...errors, assigned: '' }) }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = errors.assigned ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
            {errorText('assigned')}
          </div>

          <div>
            <label style={labelStyle}>Tags <span style={{ textTransform: 'none', fontWeight: 400 }}>(comma separated)</span></label>
            <input style={inputStyle} placeholder="Retail, Hot Lead, VIP" value={form.tags}
              onChange={e => setForm({ ...form, tags: e.target.value })}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
          </div>
        </div>

        <div style={{ padding: '20px 28px', borderTop: '1px solid rgba(0,255,136,0.08)', display: 'flex', gap: '10px' }}>
          <button onClick={() => setDrawerOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: 'rgba(0,255,136,0.15)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Saving...' : '+ Save Contact'}
          </button>
        </div>
      </div>

      {/* Import Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: importOpen ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.95)',
        width: '580px', background: '#0a140a', borderRadius: '20px',
        border: '1px solid rgba(0,255,136,0.15)', zIndex: 300,
        opacity: importOpen ? 1 : 0, pointerEvents: importOpen ? 'all' : 'none',
        transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(0,255,136,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', margin: 0 }}>
              {importStep === 'upload' ? 'Import Contacts' : `Preview — ${importData.length} contacts found`}
            </h2>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>
              {importStep === 'upload' ? 'Upload a CSV file to import contacts in bulk' : 'Review before importing'}
            </p>
          </div>
          <button onClick={() => { setImportOpen(false); setImportStep('upload'); setImportData([]) }}
            style={{ width: 32, height: 32, borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {importStep === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed rgba(0,255,136,0.25)', borderRadius: '16px', padding: '48px 24px', textAlign: 'center', cursor: 'pointer', background: 'rgba(0,255,136,0.03)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,255,136,0.5)'; e.currentTarget.style.background = 'rgba(0,255,136,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,255,136,0.25)'; e.currentTarget.style.background = 'rgba(0,255,136,0.03)' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📂</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginBottom: '6px' }}>Click to upload CSV file</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Supports .csv with columns: name, company, email, phone, assigned</div>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expected CSV format</div>
                <div style={{ fontSize: '12px', color: '#00ff88', fontFamily: 'monospace', background: 'rgba(0,255,136,0.05)', padding: '10px 14px', borderRadius: '8px', lineHeight: '1.8' }}>
                  name,company,email,phone,assigned<br />
                  John Kamau,Kamau Ltd,john@kamau.co.ke,0712345678,Mary Otieno
                </div>
              </div>
            </div>
          )}

          {importStep === 'preview' && (
            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['Name', 'Company', 'Email', 'Phone', 'Assigned To'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importData.slice(0, 8).map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: 'white', fontWeight: 500 }}>{c.name}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{c.company}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{c.email}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{c.phone}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{c.assigned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importData.length > 8 && (
                <div style={{ padding: '10px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                  + {importData.length - 8} more contacts
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 28px 24px', borderTop: '1px solid rgba(0,255,136,0.08)', display: 'flex', gap: '10px' }}>
          {importStep === 'preview' && (
            <button onClick={() => { setImportStep('upload'); setImportData([]) }} style={{ flex: 1, padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>← Back</button>
          )}
          <button
            onClick={importStep === 'preview' ? handleImportConfirm : () => fileRef.current?.click()}
            disabled={importing || (importStep === 'preview' && importData.length === 0)}
            style={{ flex: 2, padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88', opacity: importing ? 0.6 : 1 }}>
            {importing ? 'Importing...' : importStep === 'upload' ? '📂 Choose CSV File' : `✓ Import ${importData.length} Contacts`}
          </button>
        </div>
      </div>
    </div>
  )
}