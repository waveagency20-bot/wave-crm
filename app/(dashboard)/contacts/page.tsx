'use client'

import { useState, useEffect, useRef } from 'react'
import Sidebar from '@/components/sidebar'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const sourceIcons: Record<string, string> = {
  WhatsApp: '💬', 'Web Form': '🌐', Email: '📧',
  'Social Media': '📱', Referral: '🤝', Import: '📂', manual: '✍️',
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
  if (seconds < 60)    return 'Just now'
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ContactsPage() {
  const [contacts,    setContacts]    = useState<Contact[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [selected,    setSelected]    = useState<string[]>([])
  const [viewMode,    setViewMode]    = useState<'table' | 'cards'>('cards')
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [form,        setForm]        = useState(emptyForm)
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [submitting,  setSubmitting]  = useState(false)
  const [importOpen,  setImportOpen]  = useState(false)
  const [importStep,  setImportStep]  = useState<'upload' | 'preview'>('upload')
  const [importData,  setImportData]  = useState<any[]>([])
  const [importing,   setImporting]   = useState(false)
  const [isMobile,    setIsMobile]    = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Detect mobile — default to cards view on mobile
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setViewMode('cards')
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { fetchContacts() }, [])

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userProfile } = await supabase
        .from('users').select('organisation_id').eq('auth_id', user.id).single()

      if (!userProfile) return

      const { data, error } = await supabase
        .from('contacts').select('*')
        .eq('organisation_id', userProfile.organisation_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setContacts(data.map((c: any) => ({
        id:          c.id,
        name:        c.name,
        company:     c.company     || '',
        email:       c.email       || '',
        phone:       c.phone       || '',
        source:      c.source      || 'manual',
        tags:        c.tags        || [],
        assigned:    c.assigned_to || '',
        lastContact: timeAgo(c.last_contact || c.created_at),
      })))
    } catch (err) {
      console.error('Error fetching contacts:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())    ||
    c.company.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())   ||
    c.assigned.toLowerCase().includes(search.toLowerCase())
  )

  const toggleSelect  = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const toggleAll = () =>
    setSelected(prev => prev.length === filtered.length ? [] : filtered.map(c => c.id))

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}
    if (!form.name)     newErrors.name     = 'Name is required'
    if (!form.company)  newErrors.company  = 'Company is required'
    if (!form.email)    newErrors.email    = 'Email is required'
    if (!form.assigned) newErrors.assigned = 'Please enter who this contact is assigned to'
    if (form.email && !validateEmail(form.email)) newErrors.email = 'Enter a valid email'
    if (form.phone && !validatePhone(form.phone)) newErrors.phone = 'Enter a valid Kenyan number e.g. 0712345678'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users').select('organisation_id, id').eq('auth_id', user.id).single()

      if (!userProfile) throw new Error('User profile not found')

      const { data, error } = await supabase
        .from('contacts')
        .insert({
          organisation_id: userProfile.organisation_id,
          name:        form.name,
          company:     form.company,
          email:       form.email,
          phone:       form.phone,
          source:      form.source,
          assigned_to: form.assigned,
          tags:        form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          created_by:  userProfile.id,
          last_contact: new Date().toISOString(),
        })
        .select().single()

      if (error) throw error

      setContacts(prev => [{
        id:          data.id,
        name:        data.name,
        company:     data.company     || '',
        email:       data.email       || '',
        phone:       data.phone       || '',
        source:      data.source      || 'manual',
        tags:        data.tags        || [],
        assigned:    data.assigned_to || '',
        lastContact: 'Just now',
      }, ...prev])

      setForm(emptyForm)
      setErrors({})
      setSubmitting(false)
      setDrawerOpen(false)
    } catch (err: any) {
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
      const { error } = await supabase.from('contacts').update({ assigned_to: name }).in('id', selected)
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
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'wave-crm-contacts.csv'; a.click()
    URL.revokeObjectURL(url)
    setSelected([])
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text    = ev.target?.result as string
      const lines   = text.split('\n').filter(Boolean)
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const parsed  = lines.slice(1).map((line, i) => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        const get    = (key: string) => values[headers.indexOf(key)] || ''
        return {
          name:     get('name') || get('full name') || `Contact ${i + 1}`,
          company:  get('company')  || '',
          email:    get('email')    || '',
          phone:    get('phone')    || get('mobile') || '',
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
        .from('users').select('organisation_id, id').eq('auth_id', user.id).single()

      if (!userProfile) throw new Error('User profile not found')

      const inserts = importData.map(c => ({
        organisation_id: userProfile.organisation_id,
        name:        c.name,
        company:     c.company,
        email:       c.email,
        phone:       c.phone,
        source:      'Import',
        assigned_to: c.assigned || '',
        tags:        ['Imported'],
        created_by:  userProfile.id,
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
            <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: 'white', margin: 0 }}>Contacts & Leads</h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
              {loading ? 'Loading...' : `${contacts.length} total contacts`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
            <button
              onClick={() => { setImportOpen(true); setImportStep('upload') }}
              style={{ flex: isMobile ? 1 : 'none', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 500, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
            >
              Import
            </button>
            <button
              onClick={() => { setForm(emptyForm); setErrors({}); setDrawerOpen(true) }}
              style={{ flex: isMobile ? 1 : 'none', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: 'rgba(0,255,136,0.15)', border: '0.5px solid rgba(0,255,136,0.3)', color: '#00ff88', cursor: 'pointer' }}
            >
              + Add Contact
            </button>
          </div>
        </div>

        {/* ── Search + View toggle ── */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>🔍</span>
            <input
              type="text" placeholder="Search contacts..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '36px' }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
          {/* View toggle — hidden on mobile, always cards */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: '4px', padding: '4px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              {(['table', 'cards'] as const).map(v => (
                <button key={v} onClick={() => setViewMode(v)}
                  style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', border: 'none', background: viewMode === v ? 'rgba(0,255,136,0.15)' : 'transparent', color: viewMode === v ? '#00ff88' : 'rgba(255,255,255,0.4)' }}>
                  {v === 'table' ? '☰ Table' : '⊞ Cards'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Bulk actions ── */}
        {selected.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(0,255,136,0.08)', border: '0.5px solid rgba(0,255,136,0.2)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#00ff88' }}>{selected.length} selected</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: 'Assign',  action: handleAssignBulk, color: 'rgba(255,255,255,0.6)',  bg: 'rgba(255,255,255,0.08)' },
                { label: 'Tag',     action: handleTagBulk,    color: 'rgba(255,255,255,0.6)',  bg: 'rgba(255,255,255,0.08)' },
                { label: 'Export',  action: handleExport,     color: 'rgba(255,255,255,0.6)',  bg: 'rgba(255,255,255,0.08)' },
                { label: 'Delete',  action: () => handleDelete(selected), color: '#ff6b6b', bg: 'rgba(255,107,107,0.15)' },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action}
                  style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: btn.bg, color: btn.color, border: 'none' }}>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Loading contacts...</span>
          </div>
        )}

        {/* ── Table View (desktop only) ── */}
        {!loading && viewMode === 'table' && !isMobile && (
          <div style={{ borderRadius: '16px', overflow: 'hidden', background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>
                      <input type="checkbox"
                        checked={selected.length === filtered.length && filtered.length > 0}
                        onChange={toggleAll} />
                    </th>
                    {['Name', 'Source', 'Phone', 'Email', 'Tags', 'Assigned To', 'Last Contact', ''].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(contact => (
                    <tr key={contact.id}
                      style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)', transition: 'background 0.1s', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,255,136,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 16px' }}>
                        <input type="checkbox" checked={selected.includes(contact.id)} onChange={() => toggleSelect(contact.id)} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0, background: 'rgba(0,255,136,0.12)', color: '#00ff88' }}>
                            {getInitials(contact.name)}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'white' }}>{contact.name}</div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{contact.company}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{sourceIcons[contact.source] || '✍️'} {contact.source}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{contact.phone}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{contact.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {contact.tags.map(tag => (
                            <span key={tag} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, background: 'rgba(0,255,136,0.1)', color: '#00ff88' }}>
                            {getInitials(contact.assigned || '?')}
                          </div>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{contact.assigned}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{contact.lastContact}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button style={{ padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '0.5px solid rgba(0,255,136,0.2)' }}>View</button>
                          <button onClick={() => handleDelete([contact.id])}
                            style={{ padding: '5px 10px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', background: 'rgba(255,107,107,0.08)', color: 'rgba(255,107,107,0.6)', border: '0.5px solid rgba(255,107,107,0.1)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.2)'; e.currentTarget.style.color = '#ff6b6b' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.08)'; e.currentTarget.style.color = 'rgba(255,107,107,0.6)' }}>
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>👥</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>No contacts yet</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>Add your first contact to get started</div>
              </div>
            )}
          </div>
        )}

        {/* ── Cards View (default on mobile, optional on desktop) ── */}
        {!loading && (viewMode === 'cards' || isMobile) && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '12px',
          }}>
            {filtered.map(contact => (
              <div key={contact.id}
                style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)', borderRadius: '16px', padding: '16px', cursor: 'pointer', transition: 'border 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.border = '0.5px solid rgba(0,255,136,0.3)'}
                onMouseLeave={e => e.currentTarget.style.border = '0.5px solid rgba(0,255,136,0.1)'}>

                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, background: 'rgba(0,255,136,0.12)', color: '#00ff88', flexShrink: 0 }}>
                      {getInitials(contact.name)}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{contact.name}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>{contact.company}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '16px' }}>{sourceIcons[contact.source] || '✍️'}</span>
                </div>

                {/* Contact details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  {contact.email && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📧 {contact.email}</div>}
                  {contact.phone && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>📞 {contact.phone}</div>}
                  {contact.assigned && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>👤 {contact.assigned}</div>}
                </div>

                {/* Tags */}
                {contact.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                    {contact.tags.map(tag => (
                      <span key={tag} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>{tag}</span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{contact.lastContact}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '0.5px solid rgba(0,255,136,0.2)' }}>View</button>
                    <button onClick={() => handleDelete([contact.id])}
                      style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: 'rgba(255,107,107,0.08)', color: 'rgba(255,107,107,0.6)', border: '0.5px solid rgba(255,107,107,0.1)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.2)'; e.currentTarget.style.color = '#ff6b6b' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.08)'; e.currentTarget.style.color = 'rgba(255,107,107,0.6)' }}>
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1', padding: '64px 24px', textAlign: 'center', borderRadius: '16px', background: 'rgba(10,20,10,0.4)', border: '0.5px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>👥</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>No contacts yet</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>Add your first contact to get started</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Backdrop ── */}
      {(drawerOpen || importOpen) && (
        <div onClick={() => { setDrawerOpen(false); setImportOpen(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
      )}

      {/* ── Add Contact Drawer — full screen on mobile ── */}
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
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'white', margin: 0 }}>Add New Contact</h2>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>Fill in the contact details below</p>
          </div>
          <button onClick={() => setDrawerOpen(false)} style={{ width: 36, height: 36, borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Name + Company — stacked on mobile */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
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
                  padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
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

        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(0,255,136,0.08)', display: 'flex', gap: '10px' }}>
          <button onClick={() => setDrawerOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: 'rgba(0,255,136,0.15)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Saving...' : '+ Save Contact'}
          </button>
        </div>
      </div>

      {/* ── Import Modal — full screen on mobile ── */}
      <div style={{
        position: 'fixed',
        top:    isMobile ? 0        : '50%',
        left:   isMobile ? 0        : '50%',
        right:  isMobile ? 0        : 'auto',
        bottom: isMobile ? 0        : 'auto',
        transform: isMobile ? 'none' : importOpen ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.95)',
        width:  isMobile ? '100%'   : '580px',
        background: '#0a140a',
        borderRadius: isMobile ? 0 : '20px',
        border: '1px solid rgba(0,255,136,0.15)',
        zIndex: 300,
        opacity: importOpen ? 1 : 0,
        pointerEvents: importOpen ? 'all' : 'none',
        transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        maxHeight: isMobile ? '100%' : '80vh',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(0,255,136,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'white', margin: 0 }}>
              {importStep === 'upload' ? 'Import Contacts' : `Preview — ${importData.length} contacts found`}
            </h2>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>
              {importStep === 'upload' ? 'Upload a CSV file to import contacts in bulk' : 'Review before importing'}
            </p>
          </div>
          <button onClick={() => { setImportOpen(false); setImportStep('upload'); setImportData([]) }}
            style={{ width: 36, height: 36, borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {importStep === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div onClick={() => fileRef.current?.click()}
                style={{ border: '2px dashed rgba(0,255,136,0.25)', borderRadius: '16px', padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: 'rgba(0,255,136,0.03)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,255,136,0.5)'; e.currentTarget.style.background = 'rgba(0,255,136,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,255,136,0.25)'; e.currentTarget.style.background = 'rgba(0,255,136,0.03)' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📂</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginBottom: '6px' }}>Tap to upload CSV file</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Supports .csv with columns: name, company, email, phone, assigned</div>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expected CSV format</div>
                <div style={{ fontSize: '12px', color: '#00ff88', fontFamily: 'monospace', background: 'rgba(0,255,136,0.05)', padding: '10px 14px', borderRadius: '8px', lineHeight: 1.8, overflowX: 'auto' }}>
                  name,company,email,phone,assigned<br />
                  John Kamau,Kamau Ltd,john@kamau.co.ke,0712345678,Mary Otieno
                </div>
              </div>
            </div>
          )}

          {importStep === 'preview' && (
            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {['Name', 'Company', 'Email', 'Phone', 'Assigned'].map(h => (
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
              </div>
              {importData.length > 8 && (
                <div style={{ padding: '10px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                  + {importData.length - 8} more contacts
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px 20px', borderTop: '1px solid rgba(0,255,136,0.08)', display: 'flex', gap: '10px' }}>
          {importStep === 'preview' && (
            <button onClick={() => { setImportStep('upload'); setImportData([]) }}
              style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
              Back
            </button>
          )}
          <button
            onClick={importStep === 'preview' ? handleImportConfirm : () => fileRef.current?.click()}
            disabled={importing || (importStep === 'preview' && importData.length === 0)}
            style={{ flex: 2, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88', opacity: importing ? 0.6 : 1 }}>
            {importing ? 'Importing...' : importStep === 'upload' ? 'Choose CSV File' : `Import ${importData.length} Contacts`}
          </button>
        </div>
      </div>
    </div>
  )
}