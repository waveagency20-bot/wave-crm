'use client'

import { useState, useEffect, useRef } from 'react'
import Sidebar from '@/components/sidebar'
import { supabase } from '@/lib/supabase'

type Message = {
  id: string
  contactId: string
  from: string
  company: string
  preview: string
  time: string
  unread: boolean
  assigned: string
  channel: 'WhatsApp' | 'Email' | 'SMS'
  thread: { id: string; sender: 'contact' | 'agent'; text: string; time: string }[]
}

const channelColors: Record<string, string> = {
  WhatsApp: '#00ff88', Email: '#38bdf8', SMS: '#fbbf24',
}

const channelBg: Record<string, string> = {
  WhatsApp: 'rgba(0,255,136,0.12)', Email: 'rgba(56,189,248,0.15)', SMS: 'rgba(251,191,36,0.15)',
}

const channelIcons: Record<string, string> = {
  WhatsApp: '💬', Email: '📧', SMS: '📱',
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

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState('')
  const [userId, setUserId] = useState('')
  const [activeChannel, setActiveChannel] = useState<'WhatsApp' | 'Email' | 'SMS'>('WhatsApp')
  const [selected, setSelected] = useState<Message | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [assignInput, setAssignInput] = useState('')
  const [showAssign, setShowAssign] = useState(false)
  const threadEndRef = useRef<HTMLDivElement>(null)
  const orgIdRef = useRef('')

  useEffect(() => {
    fetchMessages()
  }, [])

  useEffect(() => {
    orgIdRef.current = orgId
  }, [orgId])

  useEffect(() => {
    if (!orgId) return

    // Realtime subscription for new messages
    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMsg = payload.new as any

          // Only process messages for this org
          if (newMsg.organisation_id !== orgIdRef.current) return

          // Fetch contact info
          const { data: contact } = await supabase
            .from('contacts')
            .select('name, company')
            .eq('id', newMsg.contact_id)
            .single()

          const contactName = contact?.name || 'Unknown'
          const company = contact?.company || ''
          const channelType: 'WhatsApp' | 'Email' | 'SMS' =
            newMsg.channel === 'whatsapp' ? 'WhatsApp' :
            newMsg.channel === 'email' ? 'Email' : 'SMS'
          const key = `${newMsg.contact_id}_${newMsg.channel}`

          const newThread = {
            id: newMsg.id,
            sender: newMsg.direction === 'inbound' ? 'contact' as const : 'agent' as const,
            text: newMsg.content,
            time: 'Just now',
          }

          setMessages(prev => {
            const existing = prev.find(m => m.id === key)
            if (existing) {
              return prev.map(m => m.id === key ? {
                ...m,
                thread: [...m.thread, newThread],
                preview: newMsg.content,
                time: 'Just now',
                unread: newMsg.direction === 'inbound' ? true : m.unread,
              } : m)
            } else {
              return [{
                id: key,
                contactId: newMsg.contact_id,
                from: contactName,
                company,
                preview: newMsg.content,
                time: 'Just now',
                unread: newMsg.direction === 'inbound',
                assigned: newMsg.sent_by || '',
                channel: channelType,
                thread: [newThread],
              }, ...prev]
            }
          })

          // Update selected conversation if open
          setSelected(prev => {
            if (!prev || prev.id !== key) return prev
            return {
              ...prev,
              thread: [...prev.thread, newThread],
              preview: newMsg.content,
            }
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orgId])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selected?.thread])

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userProfile } = await supabase
        .from('users')
        .select('organisation_id, id, name')
        .eq('auth_id', user.id)
        .single()

      if (!userProfile) return
      setOrgId(userProfile.organisation_id)
      setUserId(userProfile.name || 'Agent')

      const { data, error } = await supabase
        .from('messages')
        .select('*, contacts(name, company)')
        .eq('organisation_id', userProfile.organisation_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const conversations: Record<string, Message> = {}

      data.forEach((msg: any) => {
        const key = `${msg.contact_id}_${msg.channel}`
        const contactName = msg.contacts?.name || 'Unknown'
        const company = msg.contacts?.company || ''

        if (!conversations[key]) {
          conversations[key] = {
            id: key,
            contactId: msg.contact_id,
            from: contactName,
            company,
            preview: msg.content,
            time: timeAgo(msg.created_at),
            unread: !msg.read && msg.direction === 'inbound',
            assigned: msg.sent_by || '',
            channel: msg.channel === 'whatsapp' ? 'WhatsApp' : msg.channel === 'email' ? 'Email' : 'SMS',
            thread: [],
          }
        }

        conversations[key].thread.push({
          id: msg.id,
          sender: msg.direction === 'inbound' ? 'contact' : 'agent',
          text: msg.content,
          time: timeAgo(msg.created_at),
        })

        conversations[key].preview = msg.content
        conversations[key].time = timeAgo(msg.created_at)
      })

      Object.values(conversations).forEach(conv => {
        conv.thread.reverse()
      })

      setMessages(Object.values(conversations))
    } catch (err) {
      console.error('Error fetching messages:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = messages.filter(m => m.channel === activeChannel)
  const unreadCount = (channel: string) => messages.filter(m => m.channel === channel && m.unread).length

  const handleSelect = async (msg: Message) => {
    setSelected(msg)
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, unread: false } : m))
    setShowAssign(false)
    setAssignInput('')
    setReply('')

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('organisation_id', orgId)
      .eq('contact_id', msg.contactId)
      .eq('direction', 'inbound')
  }

  const handleSend = async () => {
    if (!reply.trim() || !selected) return
    setSending(true)

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          organisation_id: orgId,
          contact_id: selected.contactId,
          channel: selected.channel.toLowerCase(),
          direction: 'outbound',
          content: reply,
          sent_by: userId,
          read: true,
        })
        .select()
        .single()

      if (error) throw error

      const newMsg = {
        id: data.id,
        sender: 'agent' as const,
        text: reply,
        time: 'Just now',
      }

      setMessages(prev => prev.map(m =>
        m.id === selected.id
          ? { ...m, thread: [...m.thread, newMsg], preview: reply, time: 'Just now' }
          : m
      ))
      setSelected(prev => prev ? { ...prev, thread: [...prev.thread, newMsg] } : prev)
      setReply('')
      setSending(false)

    } catch (err) {
      console.error('Error sending message:', err)
      setSending(false)
    }
  }

  const handleAssign = async () => {
    if (!assignInput.trim() || !selected) return
    setMessages(prev => prev.map(m =>
      m.id === selected.id ? { ...m, assigned: assignInput.trim() } : m
    ))
    setSelected(prev => prev ? { ...prev, assigned: assignInput.trim() } : prev)
    setAssignInput('')
    setShowAssign(false)
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#080f08', color: 'white' }}>
      <Sidebar />

      <div className="ml-60 flex-1 flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>

        {/* Header */}
        <div className="px-8 py-5 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#080f08' }}>
          <div>
            <h1 className="text-xl font-bold text-white">Messages</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {loading ? 'Loading...' : `${messages.filter(m => m.unread).length} unread messages`}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '8px', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
            <span style={{ fontSize: '11px', color: '#00ff88', fontWeight: 600 }}>Live</span>
          </div>
        </div>

        {/* Channel Tabs */}
        <div className="flex px-8 gap-1 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#080f08', paddingTop: '12px' }}>
          {(['WhatsApp', 'Email', 'SMS'] as const).map(channel => (
            <button key={channel}
              onClick={() => { setActiveChannel(channel); setSelected(null) }}
              style={{
                padding: '10px 20px', fontSize: '13px', fontWeight: 600,
                border: 'none', cursor: 'pointer', borderRadius: '10px 10px 0 0',
                background: activeChannel === channel ? channelBg[channel] : 'transparent',
                color: activeChannel === channel ? channelColors[channel] : 'rgba(255,255,255,0.4)',
                borderBottom: activeChannel === channel ? `2px solid ${channelColors[channel]}` : '2px solid transparent',
                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s',
              }}>
              {channelIcons[channel]} {channel}
              {unreadCount(channel) > 0 && (
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px', background: channelColors[channel], color: '#080f08' }}>
                  {unreadCount(channel)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">

          {/* Conversation list */}
          <div className="flex-shrink-0 overflow-y-auto"
            style={{ width: '320px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>

            {loading && (
              <div className="py-16 text-center">
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="py-16 text-center">
                <div style={{ fontSize: '32px', opacity: 0.2, marginBottom: '8px' }}>{channelIcons[activeChannel]}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>No {activeChannel} messages yet</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>
                  Messages will appear here when contacts reach out
                </div>
              </div>
            )}

            {!loading && filtered.map(msg => (
              <div key={msg.id}
                onClick={() => handleSelect(msg)}
                style={{
                  padding: '16px 20px', cursor: 'pointer', transition: 'all 0.15s',
                  background: selected?.id === msg.id ? channelBg[msg.channel] : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  borderLeft: selected?.id === msg.id ? `3px solid ${channelColors[msg.channel]}` : '3px solid transparent',
                }}
                onMouseEnter={e => { if (selected?.id !== msg.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={e => { if (selected?.id !== msg.id) e.currentTarget.style.background = 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: `${channelColors[msg.channel]}18`, color: channelColors[msg.channel], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, border: `1px solid ${channelColors[msg.channel]}25` }}>
                    {getInitials(msg.from)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '13px', fontWeight: msg.unread ? 700 : 500, color: 'white' }}>{msg.from}</span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{msg.time}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>{msg.company}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {msg.unread && <div style={{ width: 6, height: 6, borderRadius: '50%', background: channelColors[msg.channel], flexShrink: 0 }} />}
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {msg.preview}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Conversation thread */}
          {selected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Thread header */}
              <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, background: '#0a120a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${channelColors[selected.channel]}18`, color: channelColors[selected.channel], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, border: `1px solid ${channelColors[selected.channel]}25` }}>
                    {getInitials(selected.from)}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>{selected.from}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{selected.company}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Assign */}
                  <div style={{ position: 'relative' }}>
                    <div onClick={() => setShowAssign(!showAssign)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,255,136,0.2)', color: '#00ff88', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700 }}>
                        {getInitials(selected.assigned || 'UN')}
                      </div>
                      <span style={{ fontSize: '12px', color: '#00ff88' }}>{selected.assigned || 'Unassigned'}</span>
                    </div>
                    {showAssign && (
                      <div style={{ position: 'absolute', top: '40px', right: 0, zIndex: 10, background: '#0f1f0f', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '12px', padding: '12px', width: '220px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assign to</p>
                        <input value={assignInput} onChange={e => setAssignInput(e.target.value)}
                          placeholder="Enter full name..."
                          style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '8px' }} />
                        <button onClick={handleAssign} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: 'none', background: 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                          Assign
                        </button>
                      </div>
                    )}
                  </div>

                  <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', background: channelBg[selected.channel], color: channelColors[selected.channel] }}>
                    {channelIcons[selected.channel]} {selected.channel}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {selected.thread.map(msg => (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'agent' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '70%', padding: '12px 16px',
                      borderRadius: msg.sender === 'agent' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: msg.sender === 'agent' ? `${channelColors[selected.channel]}18` : 'rgba(255,255,255,0.06)',
                      border: msg.sender === 'agent' ? `1px solid ${channelColors[selected.channel]}30` : '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <p style={{ fontSize: '13px', color: 'white', margin: 0, lineHeight: 1.6 }}>{msg.text}</p>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: '4px 0 0', textAlign: msg.sender === 'agent' ? 'right' : 'left' }}>
                        {msg.sender === 'agent' ? 'You · ' : ''}{msg.time}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={threadEndRef} />
              </div>

              {/* Reply box */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, background: '#0a120a' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder={`Reply via ${selected.channel}... (Enter to send)`}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 16px', color: 'white', fontSize: '13px', outline: 'none', resize: 'none', minHeight: '48px', maxHeight: '120px', fontFamily: 'inherit' }}
                    onFocus={e => e.target.style.borderColor = `${channelColors[selected.channel]}50`}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    rows={1}
                  />
                  <button onClick={handleSend} disabled={!reply.trim() || sending}
                    style={{ padding: '12px 20px', borderRadius: '12px', border: `1px solid ${reply.trim() ? channelColors[selected.channel] + '40' : 'rgba(255,255,255,0.08)'}`, background: reply.trim() ? `${channelColors[selected.channel]}20` : 'rgba(255,255,255,0.04)', color: reply.trim() ? channelColors[selected.channel] : 'rgba(255,255,255,0.2)', fontSize: '13px', fontWeight: 700, cursor: reply.trim() ? 'pointer' : 'default', transition: 'all 0.15s', flexShrink: 0 }}>
                    {sending ? '...' : 'Send →'}
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: '6px 0 0' }}>
                  Press Enter to send · Shift+Enter for new line
                </p>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <div style={{ fontSize: '48px', opacity: 0.2 }}>{channelIcons[activeChannel]}</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>Select a conversation</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Choose a {activeChannel} conversation from the left</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}