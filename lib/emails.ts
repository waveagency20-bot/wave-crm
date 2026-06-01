import { Resend } from 'resend'

// Initialise Resend with the API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY)

// ---------------------------------------------------------------------------
// Shared design tokens
// All emails use the Wave CRM dark green brand identity.
// ---------------------------------------------------------------------------
const BRAND = {
  bg: '#080E08',
  card: '#0C130C',
  border: 'rgba(0,255,106,0.15)',
  green: '#00FF6A',
  textPrimary: '#ffffff',
  textMuted: 'rgba(255,255,255,0.5)',
  textFaint: 'rgba(255,255,255,0.3)',
  footerBg: '#060C06',
}

// ---------------------------------------------------------------------------
// Wave logo SVG rendered inline in emails
// ---------------------------------------------------------------------------
const waveLogo = `
  <table cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding-right:10px;vertical-align:middle;">
        <svg width="40" height="17" viewBox="0 0 120 50" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 25 C20 25 20 8 35 8 C50 8 50 42 65 42 C80 42 80 8 95 8 C110 8 110 25 115 25"
            stroke="${BRAND.green}" stroke-width="7" stroke-linecap="round" fill="none"/>
        </svg>
      </td>
      <td style="vertical-align:middle;">
        <span style="font-size:22px;font-weight:900;color:${BRAND.textPrimary};letter-spacing:-0.5px;">
          wave<span style="color:${BRAND.green};">.</span><span style="font-size:12px;font-weight:400;color:rgba(255,255,255,0.4);letter-spacing:3px;margin-left:3px;">CRM</span>
        </span>
      </td>
    </tr>
  </table>
`

// ---------------------------------------------------------------------------
// Shared email wrapper
// Wraps any email body content in the standard Wave CRM shell:
// dark background, card, logo header, green accent line, and footer.
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

          <!-- Logo header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              ${waveLogo}
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background-color:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;padding:48px 40px;">

              <!-- Green accent line at top of card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="height:3px;background:linear-gradient(to right,${BRAND.green},transparent);border-radius:2px;"></td>
                </tr>
              </table>

              ${bodyContent}

              <!-- Divider before footer note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;margin-bottom:24px;">
                <tr>
                  <td style="height:1px;background:rgba(255,255,255,0.08);"></td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:${BRAND.textFaint};line-height:1.6;">
                If you were not expecting this email, you can safely ignore it.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.25);">
                Wave CRM · Nairobi, Kenya
              </p>
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
// Template: Signup confirmation email
// Sent to new users immediately after they create an account.
// Parameters:
//   firstName   - The user's first name, used to personalise the greeting
//   confirmUrl  - The Supabase email confirmation URL
// ---------------------------------------------------------------------------
function signupConfirmationTemplate(firstName: string, confirmUrl: string): string {
  const body = `
    <p style="margin:0 0 8px;font-size:28px;font-weight:900;color:${BRAND.textPrimary};letter-spacing:-0.5px;">
      Welcome to Wave CRM
    </p>
    <p style="margin:0 0 32px;font-size:16px;color:${BRAND.textMuted};line-height:1.6;">
      Hi ${firstName}, your account is almost ready. Confirm your email address to get started.
    </p>

    <!-- Confirm email button -->
    <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="background-color:${BRAND.green};border-radius:10px;">
          <a href="${confirmUrl}"
            style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:800;color:#000000;text-decoration:none;letter-spacing:-0.2px;">
            Confirm my email
          </a>
        </td>
      </tr>
    </table>

    <!-- Feature summary -->
    <p style="margin:0 0 16px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">
      What you get with Wave CRM
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:${BRAND.textMuted};">Lead and contact management with visual pipeline</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:${BRAND.textMuted};">WhatsApp and SMS campaigns via Africa's Talking</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:${BRAND.textMuted};">M-Pesa and Stripe payment collection</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:${BRAND.textMuted};">Analytics and team collaboration tools</td></tr>
    </table>

    <!-- Trial notice -->
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
// Template: Team invite email
// Sent when an admin invites a colleague to their Wave CRM workspace.
// Parameters:
//   invitedByName  - Full name of the admin who sent the invite
//   companyName    - Name of the organisation the user is being invited to
//   role           - The role assigned to the invited user (admin/manager/agent)
//   inviteUrl      - The URL the invited user clicks to accept the invite
// ---------------------------------------------------------------------------
function teamInviteTemplate(
  invitedByName: string,
  companyName: string,
  role: string,
  inviteUrl: string
): string {
  // Capitalise the role for display purposes
  const displayRole = role.charAt(0).toUpperCase() + role.slice(1)

  const roleDescriptions: Record<string, string> = {
    admin: 'Full access to all settings, billing, and team management',
    manager: 'Access to pipeline, contacts, campaigns, and analytics',
    agent: 'Access to assigned contacts, leads, and tasks',
  }

  const roleDescription = roleDescriptions[role] || 'Access to the Wave CRM workspace'

  const body = `
    <p style="margin:0 0 8px;font-size:28px;font-weight:900;color:${BRAND.textPrimary};letter-spacing:-0.5px;">
      You have been invited
    </p>
    <p style="margin:0 0 32px;font-size:16px;color:${BRAND.textMuted};line-height:1.6;">
      <strong style="color:${BRAND.textPrimary};">${invitedByName}</strong> has invited you to join
      <strong style="color:${BRAND.textPrimary};">${companyName}</strong> on Wave CRM.
    </p>

    <!-- Role badge -->
    <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="background:rgba(0,255,106,0.08);border:1px solid rgba(0,255,106,0.2);border-radius:10px;padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">
            Your role
          </p>
          <p style="margin:0 0 4px;font-size:18px;font-weight:800;color:${BRAND.green};">
            ${displayRole}
          </p>
          <p style="margin:0;font-size:13px;color:${BRAND.textMuted};">
            ${roleDescription}
          </p>
        </td>
      </tr>
    </table>

    <!-- Accept invite button -->
    <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="background-color:${BRAND.green};border-radius:10px;">
          <a href="${inviteUrl}"
            style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:800;color:#000000;text-decoration:none;letter-spacing:-0.2px;">
            Accept invitation
          </a>
        </td>
      </tr>
    </table>

    <!-- What happens next -->
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
// Send function: Signup confirmation
// Called from app/api/email/signup/route.ts after account creation.
// ---------------------------------------------------------------------------
export async function sendSignupConfirmationEmail(
  email: string,
  firstName: string,
  confirmUrl: string
): Promise<void> {
  const { error } = await resend.emails.send({
    from: 'Wave CRM <noreply@wavecrm.co.ke>',
    to: email,
    subject: 'Confirm your Wave CRM account',
    html: signupConfirmationTemplate(firstName, confirmUrl),
  })

  if (error) {
    console.error('Failed to send signup confirmation email:', error)
    throw error
  }
}

// ---------------------------------------------------------------------------
// Send function: Team invite
// Called from app/api/invite/route.ts after the Supabase invite is created.
// ---------------------------------------------------------------------------
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
    from: 'Wave CRM <noreply@wavecrm.co.ke>',
    to: email,
    subject: `${invitedByName} has invited you to ${companyName} on Wave CRM`,
    html: teamInviteTemplate(invitedByName, companyName, role, inviteUrl),
  })

  if (error) {
    console.error('Failed to send team invite email:', error)
    throw error
  }
}