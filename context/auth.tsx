'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Role = 'admin' | 'manager' | 'agent'

export type Permission =
  | 'view_contacts'
  | 'add_contacts'
  | 'delete_contacts'
  | 'view_pipeline'
  | 'manage_pipeline_stages'
  | 'view_revenue'
  | 'send_campaigns'
  | 'invite_team'
  | 'manage_billing'
  | 'view_analytics'
  | 'view_all_leads'
  | 'view_settings'

export type User = {
  id: string
  name: string
  email: string
  role: Role
  avatar: string
  organisation: string
  organisationId: string
}

type RolePermissions = Record<'Manager' | 'Agent', Record<Permission, boolean>>

type AuthContextType = {
  user: User | null
  setUser: (user: User | null) => void
  isAdmin: boolean
  isManager: boolean
  isAgent: boolean
  can: (permission: Permission) => boolean
  rolePermissions: RolePermissions
  setRolePermissions: (permissions: RolePermissions) => void
  loadingAuth: boolean
}

const defaultRolePermissions: RolePermissions = {
  Manager: {
    view_contacts: true,
    add_contacts: true,
    delete_contacts: true,
    view_pipeline: true,
    manage_pipeline_stages: false,
    view_revenue: false,
    send_campaigns: true,
    invite_team: false,
    manage_billing: false,
    view_analytics: true,
    view_all_leads: true,
    view_settings: true,
  },
  Agent: {
    view_contacts: true,
    add_contacts: true,
    delete_contacts: false,
    view_pipeline: true,
    manage_pipeline_stages: false,
    view_revenue: false,
    send_campaigns: false,
    invite_team: false,
    manage_billing: false,
    view_analytics: false,
    view_all_leads: false,
    view_settings: true,
  },
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isAdmin: false,
  isManager: false,
  isAgent: false,
  can: () => false,
  rolePermissions: defaultRolePermissions,
  setRolePermissions: () => {},
  loadingAuth: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(defaultRolePermissions)
  const [loadingAuth, setLoadingAuth] = useState(true)

  useEffect(() => {
    // Fetch real user on mount
    fetchUser()

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUser()
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        setUser(null)
        setLoadingAuth(false)
        return
      }

      // Fetch user profile + organisation
      const { data: profile } = await supabase
        .from('users')
        .select('*, organisations(name, id)')
        .eq('auth_id', authUser.id)
        .single()

      if (!profile) {
        setUser(null)
        setLoadingAuth(false)
        return
      }

      setUser({
        id: profile.id,
        name: profile.name || authUser.email?.split('@')[0] || 'User',
        email: profile.email || authUser.email || '',
        role: profile.role || 'agent',
        avatar: profile.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U',
        organisation: (profile.organisations as any)?.name || '',
        organisationId: profile.organisation_id || '',
      })

      // Fetch org-specific role permissions
      const { data: permsData } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('organisation_id', profile.organisation_id)

      if (permsData && permsData.length > 0) {
        const managerPerms: Record<string, boolean> = {}
        const agentPerms: Record<string, boolean> = {}

        permsData.forEach((p: any) => {
          if (p.role === 'manager') managerPerms[p.permission] = p.enabled
          if (p.role === 'agent') agentPerms[p.permission] = p.enabled
        })

        setRolePermissions({
          Manager: { ...defaultRolePermissions.Manager, ...managerPerms } as any,
          Agent: { ...defaultRolePermissions.Agent, ...agentPerms } as any,
        })
      }

    } catch (err) {
      console.error('Error fetching user:', err)
      setUser(null)
    } finally {
      setLoadingAuth(false)
    }
  }

  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager'
  const isAgent = user?.role === 'agent'

  const can = (permission: Permission): boolean => {
    if (!user) return false
    if (user.role === 'admin') return true
    if (user.role === 'manager') return rolePermissions.Manager[permission] ?? false
    if (user.role === 'agent') return rolePermissions.Agent[permission] ?? false
    return false
  }

  return (
    <AuthContext.Provider value={{
      user, setUser,
      isAdmin, isManager, isAgent,
      can,
      rolePermissions, setRolePermissions,
      loadingAuth,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)