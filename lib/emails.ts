import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// ─── Email Templates ────────────────────────────────────────────────

function signupConfirmationTemplate(firstName: string, confirmUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to Wave CRM</title>
</head>
<body style="margin:0;padding:0;background-color:#080E08;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#080E08;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
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
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#0C130C;border:1px solid rgba(0,255,106,0.15);border-radius:16px;padding:48px 40px;">

              <!-- Green accent line -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="height:3px;background:linear-gradient(to right,#00FF6A,transparent);border-radius:2px;"></td>
                </tr>
              </table>

              <!-- Heading -->
              <p style="margin:0 0 8px;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                Welcome to Wave CRM 👋
              </p>
              <p style="margin:0 0 32px;font-size:16px;color:rgba(255,255,255,0.5);line-height:1.6;">
                Hi ${firstName}, your account is almost ready. Just confirm your email address to get started.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background-color:#00FF6A;border-radius:10px;">
                    <a href="${confirmUrl}"
                      style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:800;color:#000000;text-decoration:none;letter-spacing:-0.2px;">
                      Confirm my email →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What's next -->
              <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1px;">
                What you get with Wave CRM
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                ${[
                  ['👥', 'Lead & contact management'],
                  ['💬', 'WhatsApp & SMS campaigns'],
                  ['💳', 'M-Pesa & Stripe payments'],
                  ['📊', 'Analytics & reporting'],
                ].map(([emoji, text]) => `
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span style="font-size:16px;margin-right:10px;">${emoji}</span>
                    <span style="font-size:14px;color:rgba(255,255,255,0.6);">${text}</span>
                  </td>
                </tr>`).join('')}
              </table>

              <!-- Trial note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:rgba(0,255,106,0.06);border:1px solid rgba(0,255,106,0.15);border-radius:10px;padding:16px 20px;">
                    <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.7);line-height:1.5;">
                      🎉 <strong style="color:#00FF6A;">Your 7-day free trial starts now.</strong>
                      No credit card required. Cancel anytime.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="height:1px;background:rgba(255,255,255,0.08);"></td>
                </tr>
              </table>

              <!-- Footer note -->
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.3);line-height:1.6;">
                If you didn't create a Wave CRM account, you can safely ignore this email.
                This link expires in 24 hours.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.25);">
                Wave CRM · Nairobi, Kenya 🇰🇪
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
}

// ─── Send Functions ──────────────────────────────────────────────────

export async function sendSignupConfirmationEmail(
  email: string,
  firstName: string,
  confirmUrl: string
) {
  const { data, error } = await resend.emails.send({
    from: 'Wave CRM <noreply@wavecrm.co.ke>',
    to: email,
    subject: '👋 Confirm your Wave CRM account',
    html: signupConfirmationTemplate(firstName, confirmUrl),
  })

  if (error) {
    console.error('Failed to send signup confirmation email:', error)
    throw error
  }

  return data
}