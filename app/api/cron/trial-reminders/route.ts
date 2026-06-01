import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  sendTrialExpiring3DaysEmail,
  sendTrialExpiring1DayEmail,
  sendTrialExpiredEmail,
} from '@/lib/emails'

// ---------------------------------------------------------------------------
// Supabase admin client
// Uses service role key to read all organisations regardless of RLS.
// ---------------------------------------------------------------------------
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ---------------------------------------------------------------------------
// Helper: format a date as "1 June 2026" for use in email copy
// ---------------------------------------------------------------------------
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Helper: check if a trial end date falls on a specific day offset from today
// daysOffset 0 = today, 1 = tomorrow, 3 = in 3 days
// Compares dates at midnight to avoid time-of-day mismatches.
// ---------------------------------------------------------------------------
function isOnDay(trialEnd: string, daysOffset: number): boolean {
  const target = new Date()
  target.setDate(target.getDate() + daysOffset)
  target.setHours(0, 0, 0, 0)

  const end = new Date(trialEnd)
  end.setHours(0, 0, 0, 0)

  return end.getTime() === target.getTime()
}

// ---------------------------------------------------------------------------
// POST /api/cron/trial-reminders
//
// Called daily by Vercel Cron at 8:00 AM EAT (05:00 UTC).
// Secured with CRON_SECRET so only Vercel can trigger it.
//
// For each trialing organisation it:
//   - Sends a 3-day warning email if trial ends in exactly 3 days
//   - Sends a 1-day warning email if trial ends tomorrow
//   - Sends an expired email and locks the account if trial ended today
//
// Each email is sent to the organisation admin (role = 'admin').
// Results are logged and returned for monitoring in Vercel logs.
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  // Verify the request comes from Vercel Cron using the shared secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const results = {
    checked:  0,
    sent3day: 0,
    sent1day: 0,
    expired:  0,
    errors:   [] as string[],
  }

  try {
    // Fetch all organisations currently on a trial
    const { data: orgs, error: orgsError } = await supabaseAdmin
      .from('organisations')
      .select('id, name, trial_end')
      .eq('status', 'trialing')

    if (orgsError) throw orgsError
    if (!orgs || orgs.length === 0) {
      return NextResponse.json({ message: 'No trialing organisations found', results })
    }

    results.checked = orgs.length

    for (const org of orgs) {
      try {
        // Fetch the admin user for this organisation to get their email and name
        const { data: admin } = await supabaseAdmin
          .from('users')
          .select('name, email')
          .eq('organisation_id', org.id)
          .eq('role', 'admin')
          .single()

        // Skip if no admin found — nothing to send to
        if (!admin?.email) continue

        const firstName  = admin.name?.split(' ')[0] || 'there'
        const upgradeUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/settings?section=billing`

        // 3-day warning
        if (isOnDay(org.trial_end, 3)) {
          await sendTrialExpiring3DaysEmail(
            admin.email,
            firstName,
            org.name,
            formatDate(org.trial_end),
            upgradeUrl
          )
          results.sent3day++
        }

        // 1-day warning
        else if (isOnDay(org.trial_end, 1)) {
          await sendTrialExpiring1DayEmail(
            admin.email,
            firstName,
            org.name,
            formatDate(org.trial_end),
            upgradeUrl
          )
          results.sent1day++
        }

        // Trial expired today — send email and lock the account
        else if (isOnDay(org.trial_end, 0)) {
          await sendTrialExpiredEmail(
            admin.email,
            firstName,
            org.name,
            upgradeUrl
          )

          // Lock the organisation so users are redirected to /expired
          await supabaseAdmin
            .from('organisations')
            .update({ status: 'expired' })
            .eq('id', org.id)

          results.expired++
        }

      } catch (orgError: any) {
        // Log per-org errors but continue processing remaining organisations
        const msg = `Org ${org.id} (${org.name}): ${orgError.message}`
        console.error('trial-reminders error:', msg)
        results.errors.push(msg)
      }
    }

    console.log('trial-reminders completed:', results)
    return NextResponse.json({ success: true, results })

  } catch (error: any) {
    console.error('trial-reminders fatal error:', error)
    return NextResponse.json(
      { error: error.message || 'Cron job failed' },
      { status: 500 }
    )
  }
}