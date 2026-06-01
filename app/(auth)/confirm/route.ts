import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// GET /auth/confirm
//
// Supabase sends the user here after they click the confirmation link in
// their email. The URL contains a token_hash and type in the query string.
// This route exchanges the token for a session and redirects the user.
//
// Success: redirects to /dashboard
// Failure: redirects to /login with an error message
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') as 'email' | 'recovery' | 'invite' | null
  const next       = searchParams.get('next') ?? '/dashboard'

  // If no token present, redirect to login
  if (!token_hash || !type) {
    return NextResponse.redirect(new URL('/login?error=missing_token', request.url))
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Exchange the token hash for a valid session
  const { error } = await supabase.auth.verifyOtp({ token_hash, type })

  if (error) {
    console.error('Email confirmation error:', error.message)
    return NextResponse.redirect(
      new URL(`/login?error=confirmation_failed`, request.url)
    )
  }

  // Confirmed — redirect to dashboard
  return NextResponse.redirect(new URL(next, request.url))
}