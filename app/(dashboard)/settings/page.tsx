'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/sidebar'
import { useAuth, Permission } from '@/context/auth'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Section = 'profile' | 'company' | 'team' | 'billing' | 'notifications' | 'integrations'

type TeamMember = {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'agent'
  status: 'active' | 'invited'
  joined: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const roleColors: Record<string, string> = {
  admin: '#ff6b6b',
  manager: '#fbbf24',
  agent: '#00ff88',
}

const roleBg: Record<string, string> = {
  admin: 'rgba(255,107,107,0.15)',
  manager: 'rgba(251,191,36,0.15)',
  agent: 'rgba(0,255,136,0.12)',
}

const navSections = [
  { id: 'profile',       icon: '👤', label: 'Profile' },
  { id: 'company',       icon: '🏢', label: 'Company' },
  { id: 'team',          icon: '👥', label: 'Team Members' },
  { id: 'billing',       icon: '💳', label: 'Billing & Plan' },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'integrations',  icon: '🔌', label: 'Integrations' },
]

const allPermissions: { key: Permission; label: string; desc: string }[] = [
  { key: 'view_contacts',          label: 'View contacts & leads',     desc: 'See all contacts in the CRM' },
  { key: 'add_contacts',           label: 'Add & edit contacts',       desc: 'Create and update contact records' },
  { key: 'delete_contacts',        label: 'Delete contacts',           desc: 'Permanently remove contacts' },
  { key: 'view_pipeline',          label: 'View pipeline',             desc: 'See the sales pipeline and leads' },
  { key: 'manage_pipeline_stages', label: 'Manage pipeline stages',    desc: 'Add, rename or delete pipeline stages' },
  { key: 'view_revenue',           label: 'View revenue data',         desc: 'See deal values and revenue figures' },
  { key: 'send_campaigns',         label: 'Send campaigns',            desc: 'Create and send email/WhatsApp/SMS campaigns' },
  { key: 'invite_team',            label: 'Invite team members',       desc: 'Add new users to the workspace' },
  { key: 'manage_billing',         label: 'Manage billing',            desc: 'Change plan and payment details' },
  { key: 'view_analytics',         label: 'View analytics',            desc: 'Access reports and performance data' },
  { key: 'view_all_leads',         label: 'View all leads',            desc: 'See leads assigned to other team members' },
  { key: 'view_settings',          label: 'Access settings',           desc: 'View and update workspace settings' },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// Toggle switch used in permissions and notifications sections
const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
  <div
    onClick={onChange}
    style={{
      width: 44, height: 24, borderRadius: '12px', cursor: 'pointer',
      transition: 'all 0.2s', flexShrink: 0, position: 'relative',
      background: value ? 'rgba(0,255,136,0.3)' : 'rgba(255,255,255,0.1)',
      border: value ? '1px solid rgba(0,255,136,0.5)' : '1px solid rgba(255,255,255,0.15)',
    }}
  >
    <div style={{
      position: 'absolute', top: '3px',
      left: value ? '22px' : '3px',
      width: 16, height: 16, borderRadius: '50%',
      transition: 'left 0.2s',
      background: value ? '#00ff88' : 'rgba(255,255,255,0.4)',
    }} />
  </div>
)

// Standard card wrapper used throughout the settings sections
const Card = ({ children }: { children: React.ReactNode }) => (
  <div
    className="rounded-2xl p-6 mb-4"
    style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}
  >
    {children}
  </div>
)

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function SettingsPage() {
  const { isAdmin, rolePermissions, setRolePermissions } = useAuth()

  const [activeSection, setActiveSection]       = useState<Section>('profile')
  const [activeTeamTab, setActiveTeamTab]       = useState<'members' | 'permissions'>('members')
  const [activePermRole, setActivePermRole]     = useState<'Manager' | 'Agent'>('Manager')
  const [loading, setLoading]                   = useState(true)
  const [saving, setSaving]                     = useState(false)
  const [saved, setSaved]                       = useState(false)
  const [permissionsSaved, setPermissionsSaved] = useState(false)

  // Profile state
  const [profile, setProfile] = useState({
    name: '', email: '', phone: '', role: '', id: '', authId: '',
  })
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError]     = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Company state
  const [company, setCompany] = useState({
    id: '', name: '', website: '', email: '', phone: '',
    address: '', timezone: 'Africa/Nairobi', industry: '',
  })

  // Team state
  const [team, setTeam]               = useState<TeamMember[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole]   = useState<'admin' | 'manager' | 'agent'>('agent')
  const [inviting, setInviting]       = useState(false)

  // Notifications state
  const [notifications, setNotifications] = useState({
    newLead: true, taskDue: true, taskOverdue: true,
    campaignSent: false, dealConverted: true,
    teamActivity: false, weeklyReport: true,
    emailNotifs: true, inAppNotifs: true,
  })

  // Integrations state
  const [integrations, setIntegrations] = useState({
    whatsappConnected: false, whatsappNumber: '',
    resendConnected: false, resendKey: '',
    africasTalkingConnected: false, africasTalkingKey: '',
  })

  // Billing state
  const [billing, setBilling] = useState({
    plan: 'growth', status: 'trialing',
    trialEnd: '', nextBilling: '', amountPaid: 0,
  })

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch the current user's profile along with their organisation
      const { data: userProfile } = await supabase
        .from('users')
        .select('*, organisations(*)')
        .eq('auth_id', user.id)
        .single()

      if (!userProfile) return

      setProfile({
        id:      userProfile.id,
        authId:  user.id,
        name:    userProfile.name    || '',
        email:   userProfile.email   || '',
        phone:   userProfile.phone   || '',
        role:    userProfile.role    || 'agent',
      })

      const org = userProfile.organisations as any
      if (org) {
        setCompany({
          id:       org.id,
          name:     org.name      || '',
          website:  org.website   || '',
          email:    org.email     || '',
          phone:    org.phone     || '',
          address:  org.address   || '',
          timezone: org.timezone  || 'Africa/Nairobi',
          industry: org.industry  || '',
        })

        setBilling({
          plan:        org.plan        || 'growth',
          status:      org.status      || 'trialing',
          trialEnd:    org.trial_end   ? new Date(org.trial_end).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
          nextBilling: org.next_billing ? new Date(org.next_billing).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—',
          amountPaid:  org.amount_paid || 0,
        })

        // Fetch all team members in this organisation
        const { data: teamData } = await supabase
          .from('users')
          .select('*')
          .eq('organisation_id', org.id)
          .order('created_at')

        setTeam((teamData || []).map((m: any) => ({
          id:     m.id,
          name:   m.name  || '',
          email:  m.email || '',
          role:   m.role  || 'agent',
          status: m.status || 'active',
          joined: new Date(m.created_at).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }),
        })))

        // Fetch role permissions saved for this organisation
        const { data: permsData } = await supabase
          .from('role_permissions')
          .select('*')
          .eq('organisation_id', org.id)

        if (permsData && permsData.length > 0) {
          const managerPerms: Record<string, boolean> = {}
          const agentPerms:   Record<string, boolean> = {}

          permsData.forEach((p: any) => {
            if (p.role === 'manager') managerPerms[p.permission] = p.enabled
            if (p.role === 'agent')   agentPerms[p.permission]   = p.enabled
          })

          if (Object.keys(managerPerms).length > 0 || Object.keys(agentPerms).length > 0) {
            setRolePermissions({
              Manager: { ...rolePermissions.Manager, ...managerPerms } as any,
              Agent:   { ...rolePermissions.Agent,   ...agentPerms   } as any,
            })
          }
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
    } finally {
      setLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Profile handlers
  // ---------------------------------------------------------------------------
  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await supabase
        .from('users')
        .update({ name: profile.name, phone: profile.phone })
        .eq('id', profile.id)

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Error saving profile:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    if (!newPassword)                     { setPasswordError('Enter a new password'); return }
    if (newPassword.length < 8)           { setPasswordError('Password must be at least 8 characters'); return }
    if (newPassword !== confirmPassword)  { setPasswordError('Passwords do not match'); return }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password')
    }
  }

  // ---------------------------------------------------------------------------
  // Company handler
  // ---------------------------------------------------------------------------
  const handleSaveCompany = async () => {
    setSaving(true)
    try {
      await supabase
        .from('organisations')
        .update({
          name:     company.name,
          website:  company.website,
          email:    company.email,
          phone:    company.phone,
          address:  company.address,
          timezone: company.timezone,
          industry: company.industry,
        })
        .eq('id', company.id)

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Error saving company:', err)
    } finally {
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Team handlers
  // ---------------------------------------------------------------------------

  // Sends the invite via /api/invite which calls Supabase Auth and Resend.
  // Passes invitedByName so the email reads "John invited you to Company..."
  const handleInvite = async () => {
    if (!inviteEmail) return
    setInviting(true)
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:          inviteEmail,
          role:           inviteRole,
          organisationId: company.id,
          invitedByName:  profile.name || 'Your admin',
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Add the new member to the local list immediately without a refetch
      setTeam(prev => [...prev, {
        id:     data.user.id,
        name:   data.user.name,
        email:  data.user.email,
        role:   data.user.role,
        status: 'invited',
        joined: '—',
      }])

      setInviteEmail('')
      alert(`Invite sent to ${inviteEmail}`)
    } catch (err: any) {
      alert(err.message || 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  // Updates a team member's role in real time
  const handleRoleChange = async (id: string, role: 'admin' | 'manager' | 'agent') => {
    setTeam(prev => prev.map(m => m.id === id ? { ...m, role } : m))
    await supabase.from('users').update({ role }).eq('id', id)
  }

  // Removes a team member from the organisation and Supabase Auth
  const handleRemove = async (id: string) => {
    if (!confirm('Remove this team member?')) return
    try {
      const member = team.find(m => m.id === id)
      if (!member) return

      // Delete from users table first, then from Supabase Auth
      await supabase.from('users').delete().eq('id', id)
      await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: member.email }),
      })

      setTeam(prev => prev.filter(m => m.id !== id))
    } catch (err: any) {
      alert(err.message || 'Failed to remove member')
    }
  }

  // ---------------------------------------------------------------------------
  // Permissions handlers
  // ---------------------------------------------------------------------------
  const togglePermission = (role: 'Manager' | 'Agent', permission: Permission) => {
    setRolePermissions({
      ...rolePermissions,
      [role]: {
        ...rolePermissions[role],
        [permission]: !rolePermissions[role][permission],
      },
    })
  }

  // Upserts all role permissions for this organisation in one batch
  const handleSavePermissions = async () => {
    try {
      const upserts: any[] = []
      const roles = ['Manager', 'Agent'] as const

      roles.forEach(role => {
        allPermissions.forEach(perm => {
          upserts.push({
            organisation_id: company.id,
            role:            role.toLowerCase(),
            permission:      perm.key,
            enabled:         rolePermissions[role][perm.key],
          })
        })
      })

      const { error } = await supabase
        .from('role_permissions')
        .upsert(upserts, { onConflict: 'organisation_id,role,permission' })

      if (error) throw error

      setPermissionsSaved(true)
      setTimeout(() => setPermissionsSaved(false), 2000)
    } catch (err: any) {
      alert(err.message || 'Failed to save permissions')
    }
  }

  // ---------------------------------------------------------------------------
  // Shared styles
  // ---------------------------------------------------------------------------
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

  const planColors: Record<string, string> = {
    starter: '#818cf8', growth: '#00ff88', enterprise: '#fbbf24',
  }

  const daysLeft = billing.trialEnd
    ? Math.max(0, Math.ceil((new Date(billing.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex" style={{ background: '#080f08', color: 'white' }}>
        <Sidebar />
        <div className="ml-60 flex-1 flex items-center justify-center">
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Loading settings...</div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen flex" style={{ background: '#080f08', color: 'white' }}>
      <Sidebar />

      <div className="ml-60 flex-1 flex overflow-hidden" style={{ height: '100vh' }}>

        {/* Settings nav sidebar */}
        <div
          className="flex-shrink-0 overflow-y-auto py-8 px-4"
          style={{ width: '220px', borderRight: '1px solid rgba(255,255,255,0.05)' }}
        >
          <p
            className="text-xs uppercase tracking-wider px-3 mb-3"
            style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}
          >
            Settings
          </p>
          {navSections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id as Section)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left mb-1"
              style={{
                background: activeSection === s.id ? 'rgba(0,255,136,0.12)' : 'transparent',
                color:      activeSection === s.id ? '#00ff88' : 'rgba(255,255,255,0.45)',
                border:     activeSection === s.id ? '0.5px solid rgba(0,255,136,0.25)' : '0.5px solid transparent',
              }}
            >
              <span>{s.icon}</span>{s.label}
            </button>
          ))}
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-y-auto p-8">

          {/* ── PROFILE ── */}
          {activeSection === 'profile' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white">Profile</h2>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Manage your personal account details
                </p>
              </div>

              <Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Full Name</label>
                      <input
                        style={inputStyle}
                        value={profile.name}
                        onChange={e => setProfile({ ...profile, name: e.target.value })}
                        onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Phone</label>
                      <input
                        style={inputStyle}
                        value={profile.phone}
                        onChange={e => setProfile({ ...profile, phone: e.target.value })}
                        onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Email Address</label>
                    <input style={{ ...inputStyle, opacity: 0.5 }} value={profile.email} disabled />
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                      Email cannot be changed here
                    </p>
                  </div>
                  <div>
                    <label style={labelStyle}>Role</label>
                    <input style={{ ...inputStyle, opacity: 0.5 }} value={profile.role} disabled />
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white', margin: 0 }}>
                      Change Password
                    </h3>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>
                      Leave blank to keep your current password
                    </p>
                  </div>

                  {passwordError && (
                    <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)' }}>
                      <p style={{ fontSize: '12px', color: '#ff6b6b', margin: 0 }}>{passwordError}</p>
                    </div>
                  )}

                  {passwordSuccess && (
                    <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.25)' }}>
                      <p style={{ fontSize: '12px', color: '#00ff88', margin: 0 }}>Password updated successfully</p>
                    </div>
                  )}

                  <div>
                    <label style={labelStyle}>New Password</label>
                    <input
                      style={inputStyle} type="password" placeholder="Min 8 characters"
                      value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Confirm New Password</label>
                    <input
                      style={inputStyle} type="password" placeholder="Repeat password"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                  <button
                    onClick={handleChangePassword}
                    style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'rgba(0,255,136,0.12)', color: '#00ff88', fontSize: '13px', fontWeight: 600, outline: '1px solid rgba(0,255,136,0.25)', width: 'fit-content' }}
                  >
                    Update Password
                  </button>
                </div>
              </Card>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSaveProfile} disabled={saving}
                  style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: saved ? 'rgba(0,255,136,0.25)' : 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '14px', fontWeight: 700, outline: '1px solid rgba(0,255,136,0.3)', opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? 'Saving...' : saved ? 'Saved' : 'Save Profile'}
                </button>
              </div>
            </div>
          )}

          {/* ── COMPANY ── */}
          {activeSection === 'company' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white">Company Details</h2>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Your business information shown across Wave CRM
                </p>
              </div>

              <Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Company Name</label>
                      <input style={inputStyle} value={company.name}
                        onChange={e => setCompany({ ...company, name: e.target.value })}
                        onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                    </div>
                    <div>
                      <label style={labelStyle}>Industry</label>
                      <input style={inputStyle} value={company.industry}
                        onChange={e => setCompany({ ...company, industry: e.target.value })}
                        onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Website</label>
                      <input style={inputStyle} value={company.website}
                        onChange={e => setCompany({ ...company, website: e.target.value })}
                        onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                    </div>
                    <div>
                      <label style={labelStyle}>Company Email</label>
                      <input style={inputStyle} type="email" value={company.email}
                        onChange={e => setCompany({ ...company, email: e.target.value })}
                        onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Phone</label>
                      <input style={inputStyle} value={company.phone}
                        onChange={e => setCompany({ ...company, phone: e.target.value })}
                        onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                    </div>
                    <div>
                      <label style={labelStyle}>Timezone</label>
                      <select
                        style={{ ...inputStyle, cursor: 'pointer' }}
                        value={company.timezone}
                        onChange={e => setCompany({ ...company, timezone: e.target.value })}
                      >
                        <option value="Africa/Nairobi">Africa/Nairobi (EAT +3)</option>
                        <option value="Africa/Lagos">Africa/Lagos (WAT +1)</option>
                        <option value="Africa/Johannesburg">Africa/Johannesburg (SAST +2)</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Address</label>
                    <input style={inputStyle} value={company.address}
                      onChange={e => setCompany({ ...company, address: e.target.value })}
                      onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                  </div>
                </div>
              </Card>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSaveCompany} disabled={saving}
                  style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: saved ? 'rgba(0,255,136,0.25)' : 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '14px', fontWeight: 700, outline: '1px solid rgba(0,255,136,0.3)', opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? 'Saving...' : saved ? 'Saved' : 'Save Company'}
                </button>
              </div>
            </div>
          )}

          {/* ── TEAM ── */}
          {activeSection === 'team' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white">Team Members</h2>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Manage your team and control access permissions
                </p>
              </div>

              {/* Tab switcher: Members / Permissions */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', width: 'fit-content', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                {[
                  { id: 'members',     label: 'Members' },
                  { id: 'permissions', label: 'Permissions' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTeamTab(tab.id as any)}
                    style={{ padding: '8px 18px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s', background: activeTeamTab === tab.id ? 'rgba(0,255,136,0.15)' : 'transparent', color: activeTeamTab === tab.id ? '#00ff88' : 'rgba(255,255,255,0.4)', outline: activeTeamTab === tab.id ? '1px solid rgba(0,255,136,0.25)' : 'none' }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Members tab */}
              {activeTeamTab === 'members' && (
                <div>
                  {isAdmin && (
                    <Card>
                      <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white', margin: '0 0 16px' }}>
                        Invite a team member
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', alignItems: 'flex-end' }}>
                        <div>
                          <label style={labelStyle}>Email Address</label>
                          <input
                            style={inputStyle} type="email" placeholder="colleague@company.com"
                            value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                            onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Role</label>
                          <select
                            style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}
                            value={inviteRole}
                            onChange={e => setInviteRole(e.target.value as any)}
                          >
                            <option value="agent">Agent</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <button
                          onClick={handleInvite} disabled={!inviteEmail || inviting}
                          style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(0,255,136,0.3)', cursor: 'pointer', background: 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '13px', fontWeight: 600, opacity: inviting ? 0.6 : 1, whiteSpace: 'nowrap' as const }}
                        >
                          {inviting ? 'Sending...' : '+ Invite'}
                        </button>
                      </div>
                    </Card>
                  )}

                  <Card>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white', margin: '0 0 16px' }}>
                      {team.length} {team.length === 1 ? 'member' : 'members'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {team.map(member => (
                        <div
                          key={member.id}
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                          <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: `${roleColors[member.role]}18`, color: roleColors[member.role], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>
                            {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{member.name || member.email}</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{member.email}</div>
                          </div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                            {member.status === 'invited' ? 'Invite pending' : `Joined ${member.joined}`}
                          </div>
                          {isAdmin ? (
                            <select
                              value={member.role}
                              onChange={e => handleRoleChange(member.id, e.target.value as any)}
                              style={{ background: roleBg[member.role], color: roleColors[member.role], border: `1px solid ${roleColors[member.role]}30`, borderRadius: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                            >
                              <option value="agent">Agent</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: roleBg[member.role], color: roleColors[member.role], fontWeight: 600 }}>
                              {member.role}
                            </span>
                          )}
                          {isAdmin && member.id !== profile.id && (
                            <button
                              onClick={() => handleRemove(member.id)}
                              style={{ width: 28, height: 28, borderRadius: '8px', border: 'none', background: 'rgba(255,107,107,0.1)', color: 'rgba(255,107,107,0.5)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.2)'; e.currentTarget.style.color = '#ff6b6b' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.1)'; e.currentTarget.style.color = 'rgba(255,107,107,0.5)' }}
                            >
                              x
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* Permissions tab */}
              {activeTeamTab === 'permissions' && (
                <div>
                  {!isAdmin ? (
                    <div style={{ padding: '32px', textAlign: 'center', borderRadius: '16px', background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.15)' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '6px' }}>Admin only</div>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Only Admins can manage role permissions</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                        {(['Manager', 'Agent'] as const).map(role => (
                          <button
                            key={role}
                            onClick={() => setActivePermRole(role)}
                            style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, background: activePermRole === role ? `${roleColors[role.toLowerCase()]}18` : 'rgba(255,255,255,0.04)', color: activePermRole === role ? roleColors[role.toLowerCase()] : 'rgba(255,255,255,0.4)', outline: activePermRole === role ? `1px solid ${roleColors[role.toLowerCase()]}40` : 'none' }}
                          >
                            {role} Permissions
                          </button>
                        ))}
                      </div>

                      <Card>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {allPermissions.map((perm, i) => {
                            const enabled = rolePermissions[activePermRole][perm.key]
                            return (
                              <div
                                key={perm.key}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '10px', background: enabled ? `${roleColors[activePermRole.toLowerCase()]}06` : 'transparent', borderBottom: i < allPermissions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                              >
                                <div style={{ flex: 1, minWidth: 0, marginRight: '16px' }}>
                                  <div style={{ fontSize: '13px', fontWeight: 600, color: enabled ? 'white' : 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>{perm.label}</div>
                                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{perm.desc}</div>
                                </div>
                                <Toggle value={enabled} onChange={() => togglePermission(activePermRole, perm.key)} />
                              </div>
                            )
                          })}
                        </div>
                      </Card>

                      <Card>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white', margin: '0 0 12px' }}>Quick Presets</h3>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setRolePermissions({ ...rolePermissions, [activePermRole]: Object.fromEntries(allPermissions.map(p => [p.key, true])) as any })}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: 'rgba(0,255,136,0.12)', color: '#00ff88', outline: '1px solid rgba(0,255,136,0.25)' }}
                          >
                            Enable All
                          </button>
                          <button
                            onClick={() => setRolePermissions({ ...rolePermissions, [activePermRole]: Object.fromEntries(allPermissions.map(p => [p.key, false])) as any })}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', outline: '1px solid rgba(255,107,107,0.25)' }}
                          >
                            Disable All
                          </button>
                          <button
                            onClick={() => setRolePermissions({
                              ...rolePermissions,
                              [activePermRole]: {
                                view_contacts: true, add_contacts: true,
                                delete_contacts: activePermRole === 'Manager',
                                view_pipeline: true, manage_pipeline_stages: false,
                                view_revenue: false,
                                send_campaigns: activePermRole === 'Manager',
                                invite_team: false, manage_billing: false,
                                view_analytics: activePermRole === 'Manager',
                                view_all_leads: activePermRole === 'Manager',
                                view_settings: true,
                              }
                            })}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: `${roleColors[activePermRole.toLowerCase()]}12`, color: roleColors[activePermRole.toLowerCase()], outline: `1px solid ${roleColors[activePermRole.toLowerCase()]}30` }}
                          >
                            Reset to Default
                          </button>
                        </div>
                      </Card>

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={handleSavePermissions}
                          style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: permissionsSaved ? 'rgba(0,255,136,0.25)' : 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '14px', fontWeight: 700, outline: '1px solid rgba(0,255,136,0.3)' }}
                        >
                          {permissionsSaved ? 'Saved' : 'Save Permissions'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── BILLING ── */}
          {activeSection === 'billing' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white">Billing & Plan</h2>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Manage your subscription and payment method
                </p>
              </div>

              {billing.status === 'trialing' && (
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>
                        Free trial — {daysLeft} {daysLeft === 1 ? 'day' : 'days'} remaining
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                        Trial ends {billing.trialEnd}. Upgrade to keep access.
                      </div>
                    </div>
                    <div style={{ width: 120, height: 6, borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.max(5, (daysLeft / 7) * 100)}%`, background: daysLeft <= 2 ? '#ff6b6b' : daysLeft <= 4 ? '#fbbf24' : '#00ff88', borderRadius: '3px' }} />
                    </div>
                  </div>
                </Card>
              )}

              {billing.status === 'active' && (
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#00ff88' }}>Active Subscription</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                        Next billing: {billing.nextBilling} · Total paid: KES {billing.amountPaid.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Current plan — updated pricing */}
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Current Plan</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: planColors[billing.plan] || '#00ff88', textTransform: 'capitalize' }}>
                      {billing.plan}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                      {billing.plan === 'starter'
                        ? 'KES 3,500/mo · 1-3 users · 500 contacts · 500 SMS/month'
                        : billing.plan === 'growth'
                        ? 'KES 8,500/mo · Up to 10 users · 5,000 contacts · 2,000 SMS/month'
                        : 'KES 16,500/mo · Unlimited users & contacts · 5,000 SMS/month'}
                    </div>
                  </div>
                  <a
                    href="/expired"
                    style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', background: 'rgba(0,255,136,0.12)', color: '#00ff88', outline: '1px solid rgba(0,255,136,0.25)' }}
                  >
                    Upgrade Plan
                  </a>
                </div>
              </Card>

              <Card>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white', margin: '0 0 16px' }}>
                  Payment Method
                </h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[
                    { label: 'M-Pesa', desc: 'Safaricom Daraja' },
                  ].map(method => (
                    <div
                      key={method.label}
                      style={{ flex: 1, padding: '16px', borderRadius: '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,255,136,0.3)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{method.label}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{method.desc}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeSection === 'notifications' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white">Notifications</h2>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Choose what you want to be notified about
                </p>
              </div>

              <Card>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white', margin: '0 0 16px' }}>
                  Notification channels
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { key: 'emailNotifs', label: 'Email notifications',  desc: 'Receive notifications via email' },
                    { key: 'inAppNotifs', label: 'In-app notifications', desc: 'Show notifications inside Wave CRM' },
                  ].map(item => (
                    <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{item.label}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{item.desc}</div>
                      </div>
                      <Toggle
                        value={notifications[item.key as keyof typeof notifications] as boolean}
                        onChange={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                      />
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white', margin: '0 0 16px' }}>
                  Notify me when
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { key: 'newLead',       label: 'A new lead is added',       desc: 'Get notified when a contact is added' },
                    { key: 'taskDue',       label: 'A task is due today',        desc: 'Daily reminder for due tasks' },
                    { key: 'taskOverdue',   label: 'A task is overdue',          desc: 'Alert when tasks pass their due date' },
                    { key: 'dealConverted', label: 'A deal is converted',        desc: 'Notification for every converted deal' },
                    { key: 'campaignSent',  label: 'A campaign is sent',         desc: 'Confirmation when campaigns go out' },
                    { key: 'teamActivity',  label: 'Team member activity',       desc: 'When teammates add or update leads' },
                    { key: 'weeklyReport',  label: 'Weekly performance report',  desc: 'Summary every Monday morning' },
                  ].map(item => (
                    <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'white' }}>{item.label}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{item.desc}</div>
                      </div>
                      <Toggle
                        value={notifications[item.key as keyof typeof notifications] as boolean}
                        onChange={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                      />
                    </div>
                  ))}
                </div>
              </Card>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
                  style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: saved ? 'rgba(0,255,136,0.25)' : 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '14px', fontWeight: 700, outline: '1px solid rgba(0,255,136,0.3)' }}
                >
                  {saved ? 'Saved' : 'Save Notifications'}
                </button>
              </div>
            </div>
          )}

          {/* ── INTEGRATIONS ── */}
          {activeSection === 'integrations' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white">Integrations</h2>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Connect Wave CRM to your communication tools
                </p>
              </div>

              {[
                {
                  key: 'whatsapp', name: 'WhatsApp Business API',
                  desc: 'Meta · Send and receive WhatsApp messages',
                  connected: integrations.whatsappConnected,
                  inputLabel: 'WhatsApp Business Number',
                  inputPlaceholder: '+254 7XX XXX XXX',
                  inputValue: integrations.whatsappNumber,
                  onChange: (v: string) => setIntegrations(p => ({ ...p, whatsappNumber: v })),
                  onToggle: () => setIntegrations(p => ({ ...p, whatsappConnected: !p.whatsappConnected })),
                },
                {
                  key: 'resend', name: 'Resend',
                  desc: 'Email sending for campaigns and transactional messages',
                  connected: integrations.resendConnected,
                  inputLabel: 'Resend API Key',
                  inputPlaceholder: 're_xxxxxxxxxxxxxxxxxxxx',
                  inputValue: integrations.resendKey,
                  onChange: (v: string) => setIntegrations(p => ({ ...p, resendKey: v })),
                  onToggle: () => setIntegrations(p => ({ ...p, resendConnected: !p.resendConnected })),
                },
                {
                  key: 'at', name: "Africa's Talking",
                  desc: 'SMS · Safaricom, Airtel, Telkom coverage',
                  connected: integrations.africasTalkingConnected,
                  inputLabel: "Africa's Talking API Key",
                  inputPlaceholder: 'atsk_xxxxxxxxxxxxxxxxxxxx',
                  inputValue: integrations.africasTalkingKey,
                  onChange: (v: string) => setIntegrations(p => ({ ...p, africasTalkingKey: v })),
                  onToggle: () => setIntegrations(p => ({ ...p, africasTalkingConnected: !p.africasTalkingConnected })),
                },
              ].map(integration => (
                <div
                  key={integration.key}
                  className="rounded-2xl p-6 mb-4"
                  style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>{integration.name}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{integration.desc}</div>
                    </div>
                    <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', fontWeight: 600, background: integration.connected ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.06)', color: integration.connected ? '#00ff88' : 'rgba(255,255,255,0.4)' }}>
                      {integration.connected ? 'Connected' : 'Not connected'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>{integration.inputLabel}</label>
                      <input
                        style={inputStyle}
                        placeholder={integration.inputPlaceholder}
                        value={integration.inputValue}
                        onChange={e => integration.onChange(e.target.value)}
                        onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                    </div>
                    <button
                      onClick={integration.onToggle}
                      style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, width: 'fit-content', background: integration.connected ? 'rgba(255,107,107,0.15)' : 'rgba(0,255,136,0.15)', color: integration.connected ? '#ff6b6b' : '#00ff88', outline: `1px solid ${integration.connected ? 'rgba(255,107,107,0.3)' : 'rgba(0,255,136,0.3)'}` }}
                    >
                      {integration.connected ? 'Disconnect' : `Connect ${integration.name}`}
                    </button>
                  </div>
                </div>
              ))}

              {/* Supabase — always connected, read only */}
              <div
                className="rounded-2xl p-6 mb-4"
                style={{ background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>Supabase</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Database · Auth · Realtime · Storage</div>
                  </div>
                  <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', fontWeight: 600, background: 'rgba(0,255,136,0.15)', color: '#00ff88' }}>
                    Connected
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}