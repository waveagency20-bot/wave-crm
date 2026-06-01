import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSignupConfirmationEmail } from '@/lib/emails'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { email, firstName, confirmUrl } = await request.json()

    if (!email || !firstName || !confirmUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    await sendSignupConfirmationEmail(email, firstName, confirmUrl)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email send error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}