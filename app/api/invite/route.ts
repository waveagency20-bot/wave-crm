import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendTeamInviteEmail } from '@/lib/emails'

// Supabase admin client — uses service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter
// Tracks invite attempts per IP address to prevent abuse.
// Allows a maximum of 5 invites per minute per IP.
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

const rateLimit = (ip: string, limit = 5, windowMs = 60000): boolean => {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  // If no record exists or the window has expired, start a fresh count
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  // Block if limit has been reached within the current window
  if (record.count >= limit) return false

  record.count++
  return true
}

// ---------------------------------------------------------------------------
// POST /api/invite
// Called from the settings page when an admin invites a team member.
// Steps:
//   1. Rate limit check
//   2. Validate request body
//   3. Check for duplicate invite in same organisation
//   4. Fetch the inviting admin's name and company name for the email
//   5. Send invite via Supabase Auth (generates the magic invite link)
//   6. Pre-create the user profile in the users table with their role
//   7. Send branded invite email via Resend
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    // Step 1 — Rate limit: max 5 invites per minute per IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute before trying again.' },
        { status: 429 }
      )
    }

    // Step 2 — Validate request body
    const { email, role, organisationId, invitedByName } = await request.json()

    if (!email || !role || !organisationId) {
      return NextResponse.json(
        { error: 'Email, role and organisationId are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Step 3 — Check if this email already exists in this organisation
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('organisation_id', organisationId)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'This email has already been invited to your workspace' },
        { status: 400 }
      )
    }

    // Step 4 — Fetch the organisation name for use in the invite email
    const { data: orgData } = await supabaseAdmin
      .from('organisations')
      .select('name')
      .eq('id', organisationId)
      .single()

    const companyName = orgData?.name || 'your team'

    // Step 5 — Send invite via Supabase Auth
    // This creates the auth user and generates a magic invite link.
    // The user is redirected to /invite after clicking the link.
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/invite`,
    })

    if (error) throw error

    // Step 6 — Pre-create the user profile with their assigned role
    // Status is set to 'invited' until they complete onboarding.
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id: data.user.id,
        organisation_id: organisationId,
        name: email.split('@')[0], // Temporary name until they set it on /invite
        email,
        role,
        status: 'invited',
      })
      .select()
      .single()

    if (userError) throw userError

    // Step 7 — Send branded invite email via Resend
    // We do not throw if the email fails — the invite is already created in
    // Supabase Auth. The user can still accept via the Supabase email.
    // We log the error for monitoring purposes only.
    try {
      await sendTeamInviteEmail({
        email,
        invitedByName: invitedByName || 'Your admin',
        companyName,
        role,
        inviteUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/invite`,
      })
    } catch (emailError) {
      console.error('Resend invite email failed (invite still created):', emailError)
    }

    return NextResponse.json({ user: newUser })

  } catch (error: any) {
    console.error('Invite error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send invite' },
      { status: 400 }
    )
  }
}