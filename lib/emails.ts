import { Resend } from 'resend'

// ---------------------------------------------------------------------------
// Resend client
// Initialised once and reused across all send functions.
// ---------------------------------------------------------------------------
const resend = new Resend(process.env.RESEND_API_KEY)

// ---------------------------------------------------------------------------
// Shared brand tokens
// All email templates use these values for consistent styling.
// ---------------------------------------------------------------------------
const BRAND = {
  bg:          '#080E08',
  card:        '#0C130C',
  border:      'rgba(0,255,106,0.15)',
  green:       '#00FF6A',
  textPrimary: '#ffffff',
  textMuted:   'rgba(255,255,255,0.5)',
  textFaint:   'rgba(255,255,255,0.3)',
}

// ---------------------------------------------------------------------------
// Wave logo markup
// Rendered inline in every email header.
// ---------------------------------------------------------------------------
const waveLogo = `
  <table cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding-right:10px;vertical-align:middle;">
        <svg width="40" height="17" viewBox="0 0 120 50" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 25 C20 25 20 8 35 8 C50 8 50 42 65 42 C80 42 80 8 95 8 C110 8 110 25 115 25"
            stroke="#00FF6A" stroke-width="7" stroke-linecap="round" fill="none"/>
        </svg>
      </td>
      <td style="vertical-align:middle;">
        <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
          wave<span style="color:#00FF6A;">.</span><span style="font-size:12px;font-weight:400;color:rgba(255,255,255,0.4);letter-spacing:3px;margin-left:3px;">CRM</span>
        </span>
      </td>
    </tr>
  </table>
`

// ---------------------------------------------------------------------------
// Shared email wrapper
// Wraps body content in the standard Wave CRM dark shell with logo,
// green accent line, card container, and footer links.
// ---------------------------------------------------------------------------
const emailWrapper = (bodyContent: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <tr>
            <td align="center" style="padding-bottom:32px;">${waveLogo}</td>
          </tr>

          <tr>
            <td style="background-color:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;padding:48px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="height:3px;background:linear-gradient(to right,${BRAND.green},transparent);border-radius:2px;"></td>
                </tr>
              </table>

              ${bodyContent}

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;margin-bottom:24px;">
                <tr><td style="height:1px;background:rgba(255,255,255,0.08);"></td></tr>
              </table>

              <p style="margin:0;font-size:13px;color:${BRAND.textFaint};line-height:1.6;">
                If you have any questions, reply to this email or contact us at
                <a href="mailto:support@wavecrm.co.ke" style="color:${BRAND.green};text-decoration:none;">support@wavecrm.co.ke</a>.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.25);">Wave CRM · Nairobi, Kenya</p>
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.15);">
                <a href="https://wavecrm.co.ke/privacy-policy" style="color:rgba(255,255,255,0.25);text-decoration:none;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="https://wavecrm.co.ke/terms-of-service" style="color:rgba(255,255,255,0.25);text-decoration:none;">Terms of Service</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

// ---------------------------------------------------------------------------
// Reusable CTA button block
// Used in all emails that have a primary action button.
// ---------------------------------------------------------------------------
const ctaButton = (label: string, url: string): string => `
  <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
    <tr>
      <td style="background-color:${BRAND.green};border-radius:10px;">
        <a href="${url}"
          style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:800;color:#000000;text-decoration:none;letter-spacing:-0.2px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>
`

// ---------------------------------------------------------------------------
// Template: Signup confirmation
// Sent immediately after a new account is created.
// ---------------------------------------------------------------------------
function signupConfirmationTemplate(firstName: string, confirmUrl: string): string {
  const body = `
    <p style="margin:0 0 8px;font-size:28px;font-weight:900;color:${BRAND.textPrimary};letter-spacing:-0.5px;">
      Welcome to Wave CRM
    </p>
    <p style="margin:0 0 32px;font-size:16px;color:${BRAND.textMuted};line-height:1.6;">
      Hi ${firstName}, your account is almost ready. Confirm your email address to get started.
    </p>

    ${ctaButton('Confirm my email', confirmUrl)}

    <p style="margin:0 0 16px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">
      What you get with Wave CRM
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:${BRAND.textMuted};">Lead and contact management with visual pipeline</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:${BRAND.textMuted};">WhatsApp and SMS campaigns via Africa's Talking</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:${BRAND.textMuted};">M-Pesa and Stripe payment collection</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:${BRAND.textMuted};">Analytics and team collaboration tools</td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:rgba(0,255,106,0.06);border:1px solid rgba(0,255,106,0.15);border-radius:10px;padding:16px 20px;">
          <p style="margin:0;font-size:14px;color:${BRAND.textMuted};line-height:1.5;">
            <strong style="color:${BRAND.green};">Your 7-day free trial starts now.</strong>
            No credit card required. Cancel anytime.
          </p>
        </td>
      </tr>
    </table>
  `
  return emailWrapper(body)
}

// ---------------------------------------------------------------------------
// Template: Team invite
// Sent when an admin invites a colleague to their workspace.
// ---------------------------------------------------------------------------
function teamInviteTemplate(
  invitedByName: string,
  companyName: string,
  role: string,
  inviteUrl: string
): string {
  const displayRole = role.charAt(0).toUpperCase() + role.slice(1)

  const roleDescriptions: Record<string, string> = {
    admin:   'Full access to all settings, billing, and team management',
    manager: 'Access to pipeline, contacts, campaigns, and analytics',
    agent:   'Access to assigned contacts, leads, and tasks',
  }

  const body = `
    <p style="margin:0 0 8px;font-size:28px;font-weight:900;color:${BRAND.textPrimary};letter-spacing:-0.5px;">
      You have been invited
    </p>
    <p style="margin:0 0 32px;font-size:16px;color:${BRAND.textMuted};line-height:1.6;">
      <strong style="color:${BRAND.textPrimary};">${invitedByName}</strong> has invited you to join
      <strong style="color:${BRAND.textPrimary};">${companyName}</strong> on Wave CRM.
    </p>

    <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;width:100%;">
      <tr>
        <td style="background:rgba(0,255,106,0.08);border:1px solid rgba(0,255,106,0.2);border-radius:10px;padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Your role</p>
          <p style="margin:0 0 4px;font-size:18px;font-weight:800;color:${BRAND.green};">${displayRole}</p>
          <p style="margin:0;font-size:13px;color:${BRAND.textMuted};">${roleDescriptions[role] || 'Access to the Wave CRM workspace'}</p>
        </td>
      </tr>
    </table>

    ${ctaButton('Accept invitation', inviteUrl)}

    <p style="margin:0 0 16px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">
      What happens next
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:${BRAND.textMuted};">Click the button above to accept your invitation</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:${BRAND.textMuted};">Set your name and password on the next screen</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:${BRAND.textMuted};">You will be taken straight to the ${companyName} workspace</td></tr>
    </table>

    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.textFaint};line-height:1.6;">
      This invite link expires in 24 hours. If it has expired, ask ${invitedByName} to send a new invite.
    </p>
  `
  return emailWrapper(body)
}

// ---------------------------------------------------------------------------
// Template: Trial expiring in 3 days
// Sent when an organisation has 3 days left on their trial.
// The tone is informational — not urgent yet.
// ---------------------------------------------------------------------------
function trialExpiring3DaysTemplate(
  firstName: string,
  companyName: string,
  trialEndDate: string,
  upgradeUrl: string
): string {
  const body = `
    <p style="margin:0 0 8px;font-size:28px;font-weight:900;color:${BRAND.textPrimary};letter-spacing:-0.5px;">
      Your trial ends in 3 days
    </p>
    <p style="margin:0 0 32px;font-size:16px;color:${BRAND.textMuted};line-height:1.6;">
      Hi ${firstName}, your Wave CRM free trial for
      <strong style="color:${BRAND.textPrimary};">${companyName}</strong>
      expires on <strong style="color:${BRAND.textPrimary};">${trialEndDate}</strong>.
      Upgrade now to keep your data and stay connected with your customers.
    </p>

    ${ctaButton('Upgrade my plan', upgradeUrl)}

    <p style="margin:0 0 16px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">
      What happens when your trial ends
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:${BRAND.textMuted};">Your account will be locked and team members will lose access</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:${BRAND.textMuted};">Your contacts, leads, and pipeline data are safely preserved</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:${BRAND.textMuted};">Upgrading restores full access instantly — no setup needed</td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:rgba(0,255,106,0.06);border:1px solid rgba(0,255,106,0.15);border-radius:10px;padding:16px 20px;">
          <p style="margin:0;font-size:14px;color:${BRAND.textMuted};line-height:1.5;">
            Plans start at <strong style="color:${BRAND.green};">KES 2,500/month</strong>.
            Pay via M-Pesa or card. Cancel anytime.
          </p>
        </td>
      </tr>
    </table>
  `
  return emailWrapper(body)
}

// ---------------------------------------------------------------------------
// Template: Trial expiring in 1 day
// Sent when an organisation has 1 day left. More urgent tone.
// ---------------------------------------------------------------------------
function trialExpiring1DayTemplate(
  firstName: string,
  companyName: string,
  trialEndDate: string,
  upgradeUrl: string
): string {
  const body = `
    <p style="margin:0 0 8px;font-size:28px;font-weight:900;color:${BRAND.textPrimary};letter-spacing:-0.5px;">
      Last chance — trial ends tomorrow
    </p>
    <p style="margin:0 0 32px;font-size:16px;color:${BRAND.textMuted};line-height:1.6;">
      Hi ${firstName}, the free trial for
      <strong style="color:${BRAND.textPrimary};">${companyName}</strong>
      expires <strong style="color:#fbbf24;">tomorrow, ${trialEndDate}</strong>.
      After that your account will be locked until you upgrade.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.25);border-radius:10px;padding:16px 20px;">
          <p style="margin:0;font-size:14px;color:${BRAND.textMuted};line-height:1.5;">
            Your contacts, leads, and pipeline are safe.
            Upgrading today takes less than 2 minutes and restores full access immediately.
          </p>
        </td>
      </tr>
    </table>

    ${ctaButton('Upgrade now — keep my data', upgradeUrl)}

    <p style="margin:0 0 16px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">
      Available plans
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:${BRAND.textMuted};">
          <strong style="color:white;">Starter</strong> — KES 2,500/month · Up to 3 users · 500 contacts
        </td>
      </tr>
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:${BRAND.textMuted};">
          <strong style="color:${BRAND.green};">Growth</strong> — KES 6,500/month · Up to 10 users · 5,000 contacts
        </td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:${BRAND.textMuted};">
          <strong style="color:#fbbf24;">Enterprise</strong> — Custom pricing · Unlimited everything
        </td>
      </tr>
    </table>
  `
  return emailWrapper(body)
}

// ---------------------------------------------------------------------------
// Template: Trial expired — account locked
// Sent on the day the trial ends. The account is already locked at this point.
// ---------------------------------------------------------------------------
function trialExpiredTemplate(
  firstName: string,
  companyName: string,
  upgradeUrl: string
): string {
  const body = `
    <p style="margin:0 0 8px;font-size:28px;font-weight:900;color:${BRAND.textPrimary};letter-spacing:-0.5px;">
      Your trial has ended
    </p>
    <p style="margin:0 0 32px;font-size:16px;color:${BRAND.textMuted};line-height:1.6;">
      Hi ${firstName}, the free trial for
      <strong style="color:${BRAND.textPrimary};">${companyName}</strong>
      has ended and your account has been locked.
      Your data is safe — upgrade to restore access immediately.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="background:rgba(255,107,107,0.08);border:1px solid rgba(255,107,107,0.25);border-radius:10px;padding:16px 20px;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#ff6b6b;">Account locked</p>
          <p style="margin:0;font-size:14px;color:${BRAND.textMuted};line-height:1.5;">
            All your contacts, leads, pipeline, and messages are preserved.
            Nothing has been deleted. Upgrading restores everything instantly.
          </p>
        </td>
      </tr>
    </table>

    ${ctaButton('Restore access now', upgradeUrl)}

    <p style="margin:0 0 16px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">
      Why upgrade to Wave CRM
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:${BRAND.textMuted};">Keep all your contacts, leads, and pipeline history</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:${BRAND.textMuted};">Continue WhatsApp, SMS, and email campaigns</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:${BRAND.textMuted};">Collect M-Pesa and Stripe payments from the CRM</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:${BRAND.textMuted};">Pay monthly in KES via M-Pesa — no annual lock-in</td></tr>
    </table>
  `
  return emailWrapper(body)
}

// ---------------------------------------------------------------------------
// Send functions
// Each function corresponds to one email type.
// All functions throw on failure so the caller can handle the error.
// ---------------------------------------------------------------------------

// Signup confirmation — called from /api/email/signup after account creation
export async function sendSignupConfirmationEmail(
  email: string,
  firstName: string,
  confirmUrl: string
): Promise<void> {
  const { error } = await resend.emails.send({
    from:    'Wave CRM <noreply@wavecrm.co.ke>',
    to:      email,
    subject: 'Confirm your Wave CRM account',
    html:    signupConfirmationTemplate(firstName, confirmUrl),
  })
  if (error) {
    console.error('sendSignupConfirmationEmail failed:', error)
    throw error
  }
}

// Team invite — called from /api/invite after Supabase invite is created
export async function sendTeamInviteEmail({
  email,
  invitedByName,
  companyName,
  role,
  inviteUrl,
}: {
  email: string
  invitedByName: string
  companyName: string
  role: string
  inviteUrl: string
}): Promise<void> {
  const { error } = await resend.emails.send({
    from:    'Wave CRM <noreply@wavecrm.co.ke>',
    to:      email,
    subject: `${invitedByName} has invited you to ${companyName} on Wave CRM`,
    html:    teamInviteTemplate(invitedByName, companyName, role, inviteUrl),
  })
  if (error) {
    console.error('sendTeamInviteEmail failed:', error)
    throw error
  }
}

// Trial expiring in 3 days — called from /api/cron/trial-reminders
export async function sendTrialExpiring3DaysEmail(
  email: string,
  firstName: string,
  companyName: string,
  trialEndDate: string,
  upgradeUrl: string
): Promise<void> {
  const { error } = await resend.emails.send({
    from:    'Wave CRM <noreply@wavecrm.co.ke>',
    to:      email,
    subject: `${companyName} — your free trial ends in 3 days`,
    html:    trialExpiring3DaysTemplate(firstName, companyName, trialEndDate, upgradeUrl),
  })
  if (error) {
    console.error('sendTrialExpiring3DaysEmail failed:', error)
    throw error
  }
}

// Trial expiring in 1 day — called from /api/cron/trial-reminders
export async function sendTrialExpiring1DayEmail(
  email: string,
  firstName: string,
  companyName: string,
  trialEndDate: string,
  upgradeUrl: string
): Promise<void> {
  const { error } = await resend.emails.send({
    from:    'Wave CRM <noreply@wavecrm.co.ke>',
    to:      email,
    subject: `${companyName} — your trial expires tomorrow`,
    html:    trialExpiring1DayTemplate(firstName, companyName, trialEndDate, upgradeUrl),
  })
  if (error) {
    console.error('sendTrialExpiring1DayEmail failed:', error)
    throw error
  }
}

// Trial expired — called from /api/cron/trial-reminders on expiry day
export async function sendTrialExpiredEmail(
  email: string,
  firstName: string,
  companyName: string,
  upgradeUrl: string
): Promise<void> {
  const { error } = await resend.emails.send({
    from:    'Wave CRM <noreply@wavecrm.co.ke>',
    to:      email,
    subject: `${companyName} — your Wave CRM trial has ended`,
    html:    trialExpiredTemplate(firstName, companyName, upgradeUrl),
  })
  if (error) {
    console.error('sendTrialExpiredEmail failed:', error)
    throw error
  }
}