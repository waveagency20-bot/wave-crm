import Link from 'next/link'
import Image from 'next/image'

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#060d06', color: 'white', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <div style={{ padding: '0 32px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,255,136,0.08)', position: 'sticky', top: 0, background: 'rgba(6,13,6,0.98)', zIndex: 100 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{ position: 'relative', width: 32, height: 32 }}>
            <Image src="/logo.webp" alt="Wave CRM" fill sizes="32px" style={{ objectFit: 'contain', borderRadius: '50%' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '15px', color: 'white' }}>
            wave.<span style={{ color: '#00ff88' }}>crm</span>
          </span>
        </Link>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link href="/terms" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Terms of Service</Link>
          <Link href="/login" style={{ fontSize: '13px', color: '#00ff88', textDecoration: 'none' }}>Sign in</Link>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px' }}>

        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#00ff88', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
            Legal
          </div>
          <h1 style={{ fontSize: '40px', fontWeight: 800, color: 'white', margin: '0 0 16px', lineHeight: 1.2 }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Last updated: May 27, 2026 · Effective: May 27, 2026
          </p>
          <div style={{ marginTop: '20px', padding: '14px 18px', borderRadius: '10px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>
              Wave CRM is operated by <strong style={{ color: 'white' }}>Wave Agency</strong>, a company registered in Kenya.
              This Privacy Policy explains how we collect, use, and protect your data in compliance with the
              <strong style={{ color: 'white' }}> Kenya Data Protection Act, 2019</strong>.
            </p>
          </div>
        </div>

        {[
          {
            title: '1. Who We Are',
            content: `Wave CRM is a customer relationship management platform operated by Wave Agency, based in Eldoret, Kenya. We provide tools for businesses to manage contacts, leads, tasks, campaigns, and team communications.

Contact us at: privacy@waveagency.co.ke
Physical address: Eldoret, Uasin Gishu County, Kenya`,
          },
          {
            title: '2. Data We Collect',
            content: `We collect the following categories of data:

Account Data: Your name, email address, phone number, company name, and password when you sign up for Wave CRM.

Business Data: Contacts, leads, tasks, campaigns, messages, and pipeline data that you add to the CRM.

Usage Data: How you use Wave CRM including pages visited, features used, and actions taken within the platform.

Payment Data: M-Pesa transaction codes and payment records. We do not store full card details — card payments are processed by Stripe.

Device Data: IP address, browser type, and device information for security purposes.`,
          },
          {
            title: '3. How We Use Your Data',
            content: `We use your data to:

- Provide and operate Wave CRM services
- Process payments and manage subscriptions
- Send important account notifications (trial expiry, billing reminders)
- Respond to support requests
- Improve our platform based on usage patterns
- Comply with legal obligations under Kenyan law
- Detect and prevent fraud or security threats

We do NOT sell your data to third parties. Ever.`,
          },
          {
            title: '4. Data Storage and Security',
            content: `Your data is stored on Supabase (PostgreSQL database) hosted in the EU West region. We implement the following security measures:

- Row Level Security (RLS) ensuring your data is isolated from other organisations
- Encrypted connections (HTTPS/TLS) for all data in transit
- Bcrypt password hashing — we never store plain text passwords
- Regular automated backups
- Access controls limiting who can view your data

Despite these measures, no system is 100% secure. We encourage you to use a strong password and keep it confidential.`,
          },
          {
            title: '5. Data Sharing',
            content: `We share your data only with trusted service providers necessary to operate Wave CRM:

- Supabase — database and authentication hosting
- Vercel — frontend hosting
- Resend — transactional email delivery
- Africa's Talking — SMS delivery (Kenya)
- Meta (WhatsApp Business API) — WhatsApp messaging
- Stripe — card payment processing
- M-Pesa (Safaricom Daraja) — mobile money payments

Each provider is bound by their own privacy policies and data processing agreements. We do not share your data with advertisers or data brokers.`,
          },
          {
            title: '6. Your Rights Under Kenyan Law',
            content: `Under the Kenya Data Protection Act 2019, you have the right to:

- Access: Request a copy of all data we hold about you
- Correction: Request correction of inaccurate or incomplete data
- Deletion: Request deletion of your personal data ("right to be forgotten")
- Portability: Receive your data in a portable format
- Objection: Object to processing of your data for marketing purposes
- Withdraw Consent: Withdraw consent at any time without affecting past processing

To exercise any of these rights, contact us at privacy@waveagency.co.ke. We will respond within 21 days as required by law.`,
          },
          {
            title: '7. Data Retention',
            content: `We retain your data for as long as your account is active. When you delete your account:

- Your personal data is deleted within 30 days
- Aggregated, anonymised usage statistics may be retained indefinitely
- Payment records are retained for 7 years as required by Kenyan tax law
- Backups are purged within 90 days

If your account is suspended for non-payment, your data is retained for 60 days before permanent deletion.`,
          },
          {
            title: '8. Cookies',
            content: `Wave CRM uses essential cookies only:

- Authentication cookies to keep you logged in (session management)
- Security cookies to protect against CSRF attacks

We do not use advertising cookies, tracking pixels, or third-party analytics that profile your behaviour.`,
          },
          {
            title: '9. Children\'s Privacy',
            content: `Wave CRM is a business tool intended for use by adults aged 18 and above. We do not knowingly collect personal data from anyone under 18 years of age. If you believe a minor has provided us with personal data, please contact us immediately at privacy@waveagency.co.ke and we will delete it promptly.`,
          },
          {
            title: '10. International Data Transfers',
            content: `Your data may be processed outside Kenya (e.g. on EU-based servers). When this occurs, we ensure appropriate safeguards are in place including standard contractual clauses and adequacy decisions as recognised under the Kenya Data Protection Act 2019.`,
          },
          {
            title: '11. Changes to This Policy',
            content: `We may update this Privacy Policy from time to time. We will notify you of significant changes by:

- Sending an email to your registered email address
- Displaying a prominent notice in Wave CRM

Continued use of Wave CRM after changes take effect constitutes acceptance of the updated policy.`,
          },
          {
            title: '12. Contact & Complaints',
            content: `For privacy-related queries or to exercise your rights:

Email: privacy@waveagency.co.ke
Phone: +254 7XX XXX XXX
Address: Wave Agency, Eldoret, Uasin Gishu County, Kenya

You also have the right to lodge a complaint with the Office of the Data Protection Commissioner (ODPC) Kenya at www.odpc.go.ke if you believe we have violated your data protection rights.`,
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', margin: '0 0 16px' }}>
              {section.title}
            </h2>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
              {section.content}
            </div>
            {i < 11 && <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginTop: '40px' }} />}
          </div>
        ))}

        {/* Footer */}
        <div style={{ marginTop: '60px', padding: '24px', borderRadius: '16px', background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '0 0 16px' }}>
            Have questions about your privacy? We're here to help.
          </p>
          <a href="mailto:privacy@waveagency.co.ke"
            style={{ display: 'inline-block', padding: '10px 24px', borderRadius: '10px', background: 'rgba(0,255,136,0.12)', color: '#00ff88', fontSize: '13px', fontWeight: 600, textDecoration: 'none', outline: '1px solid rgba(0,255,136,0.25)' }}>
            privacy@waveagency.co.ke
          </a>
        </div>
      </div>
    </div>
  )
}