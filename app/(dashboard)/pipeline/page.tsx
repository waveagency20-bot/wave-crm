'use client'

import { useState, useEffect, useRef } from 'react'
import Sidebar from '@/components/sidebar'
import { supabase } from '@/lib/supabase'

type Lead = {
  id: string
  name: string
  company: string
  value: number
  source: string
  assigned: string
  assignedFull: string
  tags: string[]
  daysInStage: number
  hot?: boolean
  stageId: string
}

type Stage = {
  id: string
  label: string
  color: string
  leads: Lead[]
}

const defaultStages = [
  { label: 'Client Contacted', color: '#818cf8' },
  { label: 'Not Interested', color: '#ff6b6b' },
  { label: 'Proposal Sent', color: '#38bdf8' },
  { label: 'Proposal Rejected', color: '#f97316' },
  { label: 'Client Converted', color: '#00ff88' },
]

const sourceOptions = ['WhatsApp', 'Email', 'Web Form', 'Social Media', 'Referral']

const sourceIcons: Record<string, string> = {
  WhatsApp: '💬', Email: '📧', 'Web Form': '🌐', 'Social Media': '📱', Referral: '🤝',
}

const assigneeOptions = [
  { id: 'JK', full: 'John K.', color: '#00ff88' },
  { id: 'MO', full: 'Mary O.', color: '#38bdf8' },
  { id: 'AW', full: 'Alex W.', color: '#fbbf24' },
]

const assigneeColors: Record<string, string> = {
  JK: '#00ff88', MO: '#38bdf8', AW: '#fbbf24',
}

const colorOptions = [
  '#818cf8', '#38bdf8', '#34d399', '#fbbf24',
  '#f97316', '#ff6b6b', '#00ff88', '#a78bfa', '#f472b6',
]

const validateEmail = (email: string) => {
  if (!email) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

const validatePhone = (phone: string) => {
  if (!phone) return true
  const cleaned = phone.replace(/[\s\-()]/g, '')
  return /^(\+254|0)[17]\d{8}$/.test(cleaned)
}

const emptyForm = {
  name: '', company: '', phone: '', email: '',
  value: '', source: 'WhatsApp', stage: '',
  assigned: 'JK', tags: '',
}

export default function PipelinePage() {
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string>('')
  const orgIdRef = useRef<string>('')
  const [dragging, setDragging] = useState<{ lead: Lead; fromStage: string } | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [manageOpen, setManageOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<Stage | null>(null)

  useEffect(() => {
    initPipeline()
  }, [])

  useEffect(() => {
    orgIdRef.current = orgId
  }, [orgId])

  // Realtime subscription
  useEffect(() => {
    if (!orgId) return

    const channel = supabase
      .channel('pipeline-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          const updatedLead = payload.new as any
          if (updatedLead.organisation_id !== orgIdRef.current) return

          setStages(prev => {
            // Remove lead from all stages first
            const withoutLead = prev.map(stage => ({
              ...stage,
              leads: stage.leads.filter(l => l.id !== updatedLead.id),
            }))

            // Add lead to new stage
            return withoutLead.map(stage => {
              if (stage.id !== updatedLead.stage_id) return stage
              // Find the existing lead data
              const existingLead = prev
                .flatMap(s => s.leads)
                .find(l => l.id === updatedLead.id)
              if (!existingLead) return stage
              return {
                ...stage,
                leads: [...stage.leads, {
                  ...existingLead,
                  stageId: updatedLead.stage_id,
                  daysInStage: updatedLead.days_in_stage || 0,
                }],
              }
            })
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
        },
        async (payload) => {
          const newLead = payload.new as any
          if (newLead.organisation_id !== orgIdRef.current) return

          // Fetch contact info
          const { data: contact } = await supabase
            .from('contacts')
            .select('name, company')
            .eq('id', newLead.contact_id)
            .single()

          const lead: Lead = {
            id: newLead.id,
            name: contact?.name || 'Unknown',
            company: contact?.company || '',
            value: newLead.value || 0,
            source: newLead.source || 'manual',
            assigned: newLead.assigned_to || '',
            assignedFull: newLead.assigned_to || '',
            tags: newLead.tags || [],
            daysInStage: newLead.days_in_stage || 0,
            hot: newLead.hot || false,
            stageId: newLead.stage_id,
          }

          setStages(prev => prev.map(stage =>
            stage.id === newLead.stage_id
              ? { ...stage, leads: [lead, ...stage.leads] }
              : stage
          ))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orgId])

  const initPipeline = async () => {
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
      orgIdRef.current = userProfile.organisation_id

      const { data: existingStages } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('organisation_id', userProfile.organisation_id)
        .order('position')

      let stageList = existingStages || []

      if (stageList.length === 0) {
        const { data: newStages } = await supabase
          .from('pipeline_stages')
          .insert(defaultStages.map((s, i) => ({
            organisation_id: userProfile.organisation_id,
            label: s.label,
            color: s.color,
            position: i,
          })))
          .select()
        stageList = newStages || []
      }

      const { data: leads } = await supabase
        .from('leads')
        .select('*, contacts(name, company)')
        .eq('organisation_id', userProfile.organisation_id)

      const mappedStages: Stage[] = stageList.map(stage => ({
        id: stage.id,
        label: stage.label,
        color: stage.color,
        leads: (leads || [])
          .filter((l: any) => l.stage_id === stage.id)
          .map((l: any) => ({
            id: l.id,
            name: l.contacts?.name || 'Unknown',
            company: l.contacts?.company || '',
            value: l.value || 0,
            source: l.source || 'manual',
            assigned: l.assigned_to || '',
            assignedFull: l.assigned_to || '',
            tags: l.tags || [],
            daysInStage: l.days_in_stage || 0,
            hot: l.hot || false,
            stageId: stage.id,
          })),
      }))

      setStages(mappedStages)
      if (mappedStages.length > 0) {
        setForm(prev => ({ ...prev, stage: mappedStages[0].id }))
      }
    } catch (err) {
      console.error('Error loading pipeline:', err)
    } finally {
      setLoading(false)
    }
  }

  const allLeads = stages.flatMap(s => s.leads)
  const totalValue = allLeads.reduce((sum, l) => sum + l.value, 0)

  const handleDragStart = (lead: Lead, stageId: string) => {
    setDragging({ lead, fromStage: stageId })
  }

  const handleDrop = async (toStageId: string) => {
    if (!dragging || dragging.fromStage === toStageId) {
      setDragging(null)
      setDragOver(null)
      return
    }

    const fromStageId = dragging.fromStage
    const draggedLead = dragging.lead
    const toStage = stages.find(s => s.id === toStageId)
    const isConverted = toStage?.label === 'Client Converted'

    // Update UI instantly
    setStages(prev => prev.map(stage => {
      if (stage.id === fromStageId) {
        return { ...stage, leads: stage.leads.filter(l => l.id !== draggedLead.id) }
      }
      if (stage.id === toStageId) {
        return { ...stage, leads: [...stage.leads, { ...draggedLead, daysInStage: 0, stageId: toStageId }] }
      }
      return stage
    }))

    // Update in Supabase
    try {
      await supabase
        .from('leads')
        .update({
          stage_id: toStageId,
          days_in_stage: 0,
          converted_at: isConverted ? new Date().toISOString() : null,
        })
        .eq('id', draggedLead.id)
    } catch (err) {
      console.error('Error updating lead stage:', err)
    }

    setDragging(null)
    setDragOver(null)
  }

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}
    if (!form.name) newErrors.name = 'Name is required'
    if (!form.company) newErrors.company = 'Company is required'
    if (!form.value) newErrors.value = 'Deal value is required'
    if (form.email && !validateEmail(form.email)) newErrors.email = 'Enter a valid email'
    if (form.phone && !validatePhone(form.phone)) newErrors.phone = 'Enter a valid Kenyan number'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setSubmitting(true)
    try {
      // Create or find contact
      let contactId = null
      if (form.email) {
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('organisation_id', orgId)
          .eq('email', form.email)
          .single()
        if (existingContact) contactId = existingContact.id
      }

      if (!contactId) {
        const { data: newContact } = await supabase
          .from('contacts')
          .insert({
            organisation_id: orgId,
            name: form.name,
            company: form.company,
            email: form.email,
            phone: form.phone,
            source: form.source,
            assigned_to: form.assigned,
            last_contact: new Date().toISOString(),
          })
          .select()
          .single()
        contactId = newContact?.id
      }

      const assignee = assigneeOptions.find(a => a.id === form.assigned)

      const { error } = await supabase
        .from('leads')
        .insert({
          organisation_id: orgId,
          contact_id: contactId,
          stage_id: stages[0]?.id,
          value: parseInt(form.value.replace(/[^0-9]/g, '')) || 0,
          source: form.source,
          assigned_to: assignee?.full || form.assigned,
          tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          days_in_stage: 0,
          hot: false,
        })

      if (error) throw error

      setForm({ ...emptyForm, stage: stages[0]?.id || '' })
      setErrors({})
      setSubmitting(false)
      setDrawerOpen(false)
      // Realtime will handle adding to UI

    } catch (err: any) {
      console.error('Error adding lead:', err)
      alert(err.message || 'Failed to add lead')
      setSubmitting(false)
    }
  }

  const handleRenameStage = async (stageId: string, newLabel: string) => {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, label: newLabel } : s))
    await supabase.from('pipeline_stages').update({ label: newLabel }).eq('id', stageId)
  }

  const handleColorStage = async (stageId: string, newColor: string) => {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, color: newColor } : s))
    await supabase.from('pipeline_stages').update({ color: newColor }).eq('id', stageId)
    setEditingStage(null)
  }

  const handleDeleteStage = async (stageId: string) => {
    const stage = stages.find(s => s.id === stageId)
    if (stage && stage.leads.length > 0) {
      alert(`Cannot delete "${stage.label}" — it has ${stage.leads.length} lead(s). Move them first.`)
      return
    }
    setStages(prev => prev.filter(s => s.id !== stageId))
    await supabase.from('pipeline_stages').delete().eq('id', stageId)
  }

  const handleAddStage = async () => {
    const { data: newStage } = await supabase
      .from('pipeline_stages')
      .insert({
        organisation_id: orgId,
        label: 'New Stage',
        color: '#a78bfa',
        position: stages.length,
      })
      .select()
      .single()

    if (newStage) {
      setStages(prev => [...prev, {
        id: newStage.id,
        label: newStage.label,
        color: newStage.color,
        leads: [],
      }])
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060d06' }}>
        <Sidebar />
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', marginLeft: '220px' }}>
          Loading pipeline...
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#060d06', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      <Sidebar />

      <div style={{ marginLeft: '220px', flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Header */}
        <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#060d06', position: 'sticky', top: 0, zIndex: 50 }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'white', margin: 0 }}>Sales Pipeline</h1>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>
              {allLeads.length} leads · KES {totalValue.toLocaleString()} total value
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Live indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
              <span style={{ fontSize: '11px', color: '#00ff88', fontWeight: 600 }}>Live</span>
            </div>
            <button onClick={() => setManageOpen(true)}
              style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
              ⚙ Manage Stages
            </button>
            <button onClick={() => { setForm({ ...emptyForm, stage: stages[0]?.id || '' }); setErrors({}); setDrawerOpen(true) }}
              style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.25)', color: '#00ff88' }}>
              + Add Lead
            </button>
          </div>
        </div>

        {/* Stage summary bar */}
        <div style={{ padding: '12px 32px', display: 'flex', gap: '32px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', background: '#070e07', flexWrap: 'wrap' }}>
          {stages.map(stage => (
            <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, boxShadow: `0 0 6px ${stage.color}` }} />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{stage.label}</span>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px', background: `${stage.color}18`, color: stage.color }}>
                {stage.leads.length}
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
                KES {stage.leads.reduce((s, l) => s + l.value, 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* Kanban board */}
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', padding: '24px 32px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', minWidth: 'max-content' }}>
            {stages.map(stage => (
              <div key={stage.id}
                onDragOver={e => { e.preventDefault(); setDragOver(stage.id) }}
                onDrop={() => handleDrop(stage.id)}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null) }}
                style={{
                  width: '290px', borderRadius: '16px',
                  background: dragOver === stage.id ? `linear-gradient(180deg, ${stage.color}0a 0%, #0a120a 100%)` : '#0a120a',
                  border: dragOver === stage.id ? `1px solid ${stage.color}50` : '1px solid rgba(255,255,255,0.07)',
                  transition: 'all 0.2s',
                }}>

                {/* Column header */}
                <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${stage.color}18`, position: 'sticky', top: 0, background: '#0a120a', borderRadius: '16px 16px 0 0', zIndex: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: stage.color, boxShadow: `0 0 10px ${stage.color}80` }} />
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{stage.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${stage.color}20`, color: stage.color }}>
                        {stage.leads.length}
                      </span>
                      <button
                        onClick={() => { setForm({ ...emptyForm, stage: stage.id }); setErrors({}); setDrawerOpen(true) }}
                        style={{ width: 22, height: 22, borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        +
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>
                    KES {stage.leads.reduce((s, l) => s + l.value, 0).toLocaleString()}
                  </div>
                </div>

                {/* Lead cards */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {stage.leads.map(lead => (
                    <div key={lead.id}
                      draggable
                      onDragStart={() => handleDragStart(lead, stage.id)}
                      style={{
                        background: '#111b11', borderRadius: '14px', padding: '18px',
                        border: '1px solid rgba(255,255,255,0.07)',
                        opacity: dragging?.lead.id === lead.id ? 0.3 : 1,
                        cursor: 'grab', transition: 'all 0.15s',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLDivElement
                        el.style.border = `1px solid ${stage.color}45`
                        el.style.transform = 'translateY(-3px)'
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLDivElement
                        el.style.border = '1px solid rgba(255,255,255,0.07)'
                        el.style.transform = 'translateY(0)'
                      }}>

                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '12px', flexShrink: 0, background: `${stage.color}15`, color: stage.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, border: `1px solid ${stage.color}25` }}>
                            {lead.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{lead.name}</span>
                              {lead.hot && <span style={{ fontSize: '13px' }}>🔥</span>}
                            </div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{lead.company}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: '18px', flexShrink: 0 }}>{sourceIcons[lead.source] || '📋'}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', background: `${stage.color}0e`, border: `1px solid ${stage.color}20` }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Deal value</span>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: stage.color }}>
                          KES {lead.value.toLocaleString()}
                        </span>
                      </div>

                      {lead.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                          {lead.tags.map(tag => (
                            <span key={tag} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${assigneeColors[lead.assigned] || '#00ff88'}18`, color: assigneeColors[lead.assigned] || '#00ff88', border: `1px solid ${assigneeColors[lead.assigned] || '#00ff88'}30` }}>
                            {lead.assigned?.[0] || '?'}
                          </div>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{lead.assignedFull}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: lead.daysInStage > 5 ? '#ff6b6b' : lead.daysInStage > 2 ? '#fbbf24' : '#00ff88' }} />
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                            {lead.daysInStage === 0 ? 'Today' : `${lead.daysInStage}d`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {stage.leads.length === 0 && (
                    <div style={{
                      padding: '48px 20px', borderRadius: '14px', textAlign: 'center',
                      border: `2px dashed ${dragOver === stage.id ? stage.color + '50' : stage.color + '18'}`,
                      background: dragOver === stage.id ? `${stage.color}05` : 'transparent',
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ fontSize: '28px', opacity: 0.2, marginBottom: '8px' }}>⊕</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.18)' }}>Drop a lead here</div>
                    </div>
                  )}
                  <div style={{ height: '8px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overlays */}
      {(drawerOpen || manageOpen) && (
        <div onClick={() => { setDrawerOpen(false); setManageOpen(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
      )}

      {/* Add Lead Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px',
        background: '#0a140a', borderLeft: '1px solid rgba(0,255,136,0.12)',
        zIndex: 300, display: 'flex', flexDirection: 'column',
        transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: drawerOpen ? '-20px 0 60px rgba(0,0,0,0.5)' : 'none',
      }}>
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(0,255,136,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', margin: 0 }}>Add New Lead</h2>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>All new leads start at Client Contacted</p>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={{ ...inputStyle, borderColor: errors.phone ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
                placeholder="+254 7XX XXX XXX" value={form.phone}
                onChange={e => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: '' }) }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                onBlur={e => e.target.style.borderColor = errors.phone ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
              {errorText('phone')}
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={{ ...inputStyle, borderColor: errors.email ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
                placeholder="john@company.com" type="email" value={form.email}
                onChange={e => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: '' }) }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                onBlur={e => e.target.style.borderColor = errors.email ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
              {errorText('email')}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Deal Value (KES) *</label>
            <input style={{ ...inputStyle, borderColor: errors.value ? '#ff6b6b' : 'rgba(255,255,255,0.1)' }}
              placeholder="50000" value={form.value}
              onChange={e => { setForm({ ...form, value: e.target.value }); setErrors({ ...errors, value: '' }) }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = errors.value ? '#ff6b6b' : 'rgba(255,255,255,0.1)'} />
            {errorText('value')}
          </div>

          <div>
            <label style={labelStyle}>Lead Source</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {sourceOptions.map(s => (
                <button key={s} onClick={() => setForm({ ...form, source: s })}
                  style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: form.source === s ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.04)', border: form.source === s ? '1px solid rgba(0,255,136,0.35)' : '1px solid rgba(255,255,255,0.08)', color: form.source === s ? '#00ff88' : 'rgba(255,255,255,0.45)' }}>
                  {sourceIcons[s]} {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Pipeline Stage</label>
            <div style={{ padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: `${stages[0]?.color || '#818cf8'}12`, border: `1px solid ${stages[0]?.color || '#818cf8'}30`, color: stages[0]?.color || '#818cf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: stages[0]?.color || '#818cf8' }} />
              {stages[0]?.label || 'Client Contacted'} — all new leads start here
            </div>
          </div>

          <div>
            <label style={labelStyle}>Assign To</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {assigneeOptions.map(a => (
                <button key={a.id} onClick={() => setForm({ ...form, assigned: a.id })}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: form.assigned === a.id ? `${a.color}15` : 'rgba(255,255,255,0.04)', border: form.assigned === a.id ? `1px solid ${a.color}40` : '1px solid rgba(255,255,255,0.08)', color: form.assigned === a.id ? a.color : 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${a.color}20`, color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>{a.id}</div>
                  {a.full}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Tags <span style={{ textTransform: 'none', fontWeight: 400 }}>(comma separated)</span></label>
            <input style={inputStyle} placeholder="Retail, Hot Lead, Tech" value={form.tags}
              onChange={e => setForm({ ...form, tags: e.target.value })}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
          </div>
        </div>

        <div style={{ padding: '20px 28px', borderTop: '1px solid rgba(0,255,136,0.08)', display: 'flex', gap: '10px' }}>
          <button onClick={() => setDrawerOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: 'rgba(0,255,136,0.15)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Adding lead...' : '+ Add to Pipeline'}
          </button>
        </div>
      </div>

      {/* Manage Stages Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: manageOpen ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.95)',
        width: '520px', background: '#0a140a', borderRadius: '20px',
        border: '1px solid rgba(0,255,136,0.15)', zIndex: 300,
        opacity: manageOpen ? 1 : 0, pointerEvents: manageOpen ? 'all' : 'none',
        transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(0,255,136,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', margin: 0 }}>Manage Stages</h2>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>Rename, recolor or delete pipeline stages</p>
          </div>
          <button onClick={() => setManageOpen(false)} style={{ width: 32, height: 32, borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {stages.map(stage => (
            <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ position: 'relative' }}>
                <div
                  onClick={() => setEditingStage(editingStage?.id === stage.id ? null : stage)}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: stage.color, cursor: 'pointer', boxShadow: `0 0 8px ${stage.color}80`, border: '2px solid rgba(255,255,255,0.2)' }} />
                {editingStage?.id === stage.id && (
                  <div style={{ position: 'absolute', top: '32px', left: 0, zIndex: 10, background: '#0f1f0f', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '12px', padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', width: '160px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                    {colorOptions.map(c => (
                      <div key={c} onClick={() => handleColorStage(stage.id, c)}
                        style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: stage.color === c ? '2px solid white' : '2px solid transparent', transition: 'transform 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
                    ))}
                  </div>
                )}
              </div>
              <input value={stage.label}
                onChange={e => handleRenameStage(stage.id, e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: '14px', fontWeight: 600 }}
                onFocus={e => e.target.style.color = stage.color}
                onBlur={e => e.target.style.color = 'white'} />
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: `${stage.color}18`, color: stage.color }}>
                {stage.leads.length} leads
              </span>
              <button onClick={() => handleDeleteStage(stage.id)}
                style={{ width: 28, height: 28, borderRadius: '8px', border: 'none', background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,107,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,107,107,0.1)'}>
                🗑
              </button>
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 28px 24px', borderTop: '1px solid rgba(0,255,136,0.08)', display: 'flex', gap: '10px' }}>
          <button onClick={handleAddStage} style={{ flex: 1, padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', color: '#00ff88' }}>+ Add New Stage</button>
          <button onClick={() => setManageOpen(false)} style={{ flex: 1, padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88' }}>Save & Close</button>
        </div>
      </div>
    </div>
  )
}