'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from '@/components/logo'
import { useAuth } from '@/context/auth'
import { supabase } from '@/lib/supabase'

const navItems = [
  { icon: '⊞', label: 'Dashboard', href: '/dashboard', permission: null },
  { icon: '👥', label: 'Contacts', href: '/contacts', permission: null },
  { icon: '📊', label: 'Pipeline', href: '/pipeline', permission: null },
  { icon: '✓', label: 'Tasks', href: '/tasks', permission: null },
  { icon: '📣', label: 'Campaigns', href: '/campaigns', permission: 'send_campaigns' },
  { icon: '💬', label: 'Messages', href: '/messages', permission: null },
  { icon: '📈', label: 'Analytics', href: '/analytics', permission: 'view_analytics' },
  { icon: '⚙', label: 'Settings', href: '/settings', permission: 'view_settings' },
]

const roleColors: Record<string, string> = {
  Admin: '#ff6b6b', admin: '#ff6b6b',
  Manager: '#fbbf24', manager: '#fbbf24',
  Agent: '#00ff88', agent: '#00ff88',
}

export default function Sidebar() {
  const pathname = usePathname()
  const { user, can } = useAuth()

  const visibleItems = navItems.filter(item =>
    item.permission === null || can(item.permission as any)
  )

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const roleColor = roleColors[user?.role || 'agent'] || '#00ff88'

  return (
    <div className="fixed left-0 top-0 bottom-0 w-60 flex flex-col"
      style={{
        background: 'rgba(8,15,8,0.98)',
        borderRight: '0.5px solid rgba(0,255,136,0.1)',
        zIndex: 999,
      }}>

      {/* Logo */}
      <div className="px-5 py-4 flex-shrink-0"
        style={{ borderBottom: '0.5px solid rgba(0,255,136,0.1)' }}>
        <Logo size={36} textSize="text-base" />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {visibleItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  background: active ? 'rgba(0,255,136,0.12)' : 'transparent',
                  color: active ? '#00ff88' : 'rgba(255,255,255,0.45)',
                  border: active ? '0.5px solid rgba(0,255,136,0.25)' : '0.5px solid transparent',
                }}>
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom — user profile + sign out */}
      <div className="flex-shrink-0 px-4 py-4"
        style={{ borderTop: '0.5px solid rgba(0,255,136,0.1)' }}>

        {/* User info */}
        <div className="flex items-center gap-3 mb-3 px-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{
              background: `${roleColor}20`,
              color: roleColor,
              border: `1px solid ${roleColor}30`,
            }}>
            {user?.avatar || user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate">
              {user?.name || 'User'}
            </div>
            <div className="text-xs font-medium capitalize" style={{ color: roleColor }}>
              {user?.role || 'agent'}
            </div>
          </div>
        </div>

        {/* Sign out button */}
        <button
          onClick={handleSignOut}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '9px 12px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            background: 'rgba(255,107,107,0.08)',
            border: '0.5px solid rgba(255,107,107,0.15)',
            color: 'rgba(255,107,107,0.6)',
            transition: 'all 0.15s',
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
          }}>
          🚪 Sign out
        </button>
      </div>
    </div>
  )
}