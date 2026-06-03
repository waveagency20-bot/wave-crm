'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from '@/components/logo'
import { useAuth } from '@/context/auth'
import { supabase } from '@/lib/supabase'

const navItems = [
  { icon: '⊞', label: 'Dashboard', href: '/dashboard',  permission: null },
  { icon: '👥', label: 'Contacts',  href: '/contacts',   permission: null },
  { icon: '📊', label: 'Pipeline',  href: '/pipeline',   permission: null },
  { icon: '✓',  label: 'Tasks',     href: '/tasks',      permission: null },
  { icon: '📣', label: 'Campaigns', href: '/campaigns',  permission: 'send_campaigns' },
  { icon: '💬', label: 'Messages',  href: '/messages',   permission: null },
  { icon: '📈', label: 'Analytics', href: '/analytics',  permission: 'view_analytics' },
  { icon: '⚙',  label: 'Settings',  href: '/settings',   permission: 'view_settings' },
]

const roleColors: Record<string, string> = {
  Admin: '#ff6b6b', admin: '#ff6b6b',
  Manager: '#fbbf24', manager: '#fbbf24',
  Agent: '#00ff88', agent: '#00ff88',
}

export default function Sidebar() {
  const pathname               = usePathname()
  const { user, can }          = useAuth()
  const [open, setOpen]        = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // ---------------------------------------------------------------------------
  // Detect mobile on mount and on resize
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close drawer on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Prevent body scroll when drawer is open on mobile
  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = open ? 'hidden' : ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open, isMobile])

  const visibleItems = navItems.filter(item =>
    item.permission === null || can(item.permission as any)
  )

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const roleColor = roleColors[user?.role || 'agent'] || '#00ff88'

  // ---------------------------------------------------------------------------
  // Sidebar inner content — shared between desktop and mobile drawer
  // ---------------------------------------------------------------------------
  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Logo + mobile close button */}
      <div style={{
        padding: '14px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
        borderBottom: '0.5px solid rgba(0,255,136,0.1)',
      }}>
        <Logo size={36} textSize="text-base" />
        {isMobile && (
          <button
            onClick={() => setOpen(false)}
            style={{
              width: 32, height: 32, borderRadius: '8px', border: 'none',
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer', fontSize: '16px', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {visibleItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: isMobile ? '14px 16px' : '10px 12px',
                  borderRadius: '12px', fontSize: '14px', fontWeight: 500,
                  textDecoration: 'none', transition: 'all 0.15s',
                  background: active ? 'rgba(0,255,136,0.12)' : 'transparent',
                  color: active ? '#00ff88' : 'rgba(255,255,255,0.45)',
                  border: active ? '0.5px solid rgba(0,255,136,0.25)' : '0.5px solid transparent',
                }}
              >
                <span style={{ fontSize: '18px', width: 24, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom — user profile + sign out */}
      <div style={{
        flexShrink: 0, padding: '16px',
        borderTop: '0.5px solid rgba(0,255,136,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '0 4px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700,
            background: `${roleColor}20`, color: roleColor,
            border: `1px solid ${roleColor}30`,
          }}>
            {user?.avatar || user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || 'User'}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: roleColor, textTransform: 'capitalize' }}>
              {user?.role || 'agent'}
            </div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', padding: isMobile ? '12px' : '9px 12px',
            borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            background: 'rgba(255,107,107,0.08)', border: '0.5px solid rgba(255,107,107,0.15)',
            color: 'rgba(255,107,107,0.6)', transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,107,107,0.15)'
            e.currentTarget.style.color = '#ff6b6b'
            e.currentTarget.style.borderColor = 'rgba(255,107,107,0.3)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,107,107,0.08)'
            e.currentTarget.style.color = 'rgba(255,107,107,0.6)'
            e.currentTarget.style.borderColor = 'rgba(255,107,107,0.15)'
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  )

  // ---------------------------------------------------------------------------
  // Mobile layout — hamburger button + slide-in drawer + backdrop
  // ---------------------------------------------------------------------------
  if (isMobile) {
    return (
      <>
        {/* Hamburger button — fixed top left */}
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', top: 12, left: 16, zIndex: 1001,
            width: 44, height: 44, borderRadius: '12px',
            background: 'rgba(8,15,8,0.95)', border: '0.5px solid rgba(0,255,136,0.2)',
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '5px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <span style={{ width: 18, height: 2, background: '#00ff88', borderRadius: 2, display: 'block' }} />
          <span style={{ width: 18, height: 2, background: '#00ff88', borderRadius: 2, display: 'block' }} />
          <span style={{ width: 18, height: 2, background: '#00ff88', borderRadius: 2, display: 'block' }} />
        </button>

        {/* Backdrop */}
        {open && (
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1002,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
            }}
          />
        )}

        {/* Slide-in drawer */}
        <div style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 1003,
          width: '280px',
          background: 'rgba(8,15,8,0.99)',
          borderRight: '0.5px solid rgba(0,255,136,0.15)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          boxShadow: open ? '4px 0 24px rgba(0,0,0,0.5)' : 'none',
        }}>
          <SidebarContent />
        </div>
      </>
    )
  }

  // ---------------------------------------------------------------------------
  // Desktop layout — fixed sidebar
  // ---------------------------------------------------------------------------
  return (
    <div
      className="fixed left-0 top-0 bottom-0 w-60"
      style={{
        background: 'rgba(8,15,8,0.98)',
        borderRight: '0.5px solid rgba(0,255,136,0.1)',
        zIndex: 999,
      }}
    >
      <SidebarContent />
    </div>
  )
}