import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

const rateLimit = (ip: string, limit = 5, windowMs = 60000) => {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= limit) return false
  record.count++
  return true
}

export async function POST(request: Request) {
  try {
    // Rate limit — max 5 invites per minute per IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute before trying again.' },
        { status: 429 }
      )
    }

    const { email, role, organisationId } = await request.json()

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

    // Check if email already exists in this organisation
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

    // Send invite email via Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/invite`,
    })

    if (error) throw error

    // Pre-create user profile with role
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id: data.user.id,
        organisation_id: organisationId,
        name: email.split('@')[0],
        email,
        role,
        status: 'invited',
      })
      .select()
      .single()

    if (userError) throw userError

    return NextResponse.json({ user: newUser })

  } catch (error: any) {
    console.error('Invite error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send invite' },
      { status: 400 }
    )
  }
}