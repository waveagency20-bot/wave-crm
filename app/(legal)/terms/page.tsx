import Link from 'next/link'
import Image from 'next/image'

export default function TermsPage() {
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
          <Link href="/privacy" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Privacy Policy</Link>
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
            Terms of Service
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Last updated: May 27, 2026 · Effective: May 27, 2026
          </p>
          <div style={{ marginTop: '20px', padding: '14px 18px', borderRadius: '10px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>
              These Terms of Service constitute a legally binding agreement between you and
              <strong style={{ color: 'white' }}> Wave Agency</strong> governing your use of Wave CRM.
              By signing up or using Wave CRM, you agree to these terms. Please read them carefully.
            </p>
          </div>
        </div>

        {[
          {
            title: '1. Acceptance of Terms',
            content: `By creating an account or using Wave CRM in any way, you confirm that:

- You are at least 18 years of age
- You have the authority to enter into this agreement on behalf of your business
- You have read, understood and agree to be bound by these Terms of Service
- You agree to our Privacy Policy which is incorporated into these terms

If you do not agree to these terms, do not use Wave CRM.`,
          },
          {
            title: '2. Description of Service',
            content: `Wave CRM is a cloud-based customer relationship management platform that provides:

- Contact and lead management
- Sales pipeline tracking
- Task management and assignment
- Email, SMS and WhatsApp campaign tools
- Team collaboration features
- Analytics and reporting

We reserve the right to modify, suspend or discontinue any feature at any time with reasonable notice.`,
          },
          {
            title: '3. Account Registration',
            content: `To use Wave CRM you must:

- Provide accurate and complete registration information
- Maintain the security of your account password
- Notify us immediately of any unauthorised access to your account
- Be responsible for all activity that occurs under your account

You may not share your login credentials with anyone outside your organisation. Each team member must have their own account.`,
          },
          {
            title: '4. Subscription Plans and Billing',
            content: `Wave CRM offers the following subscription plans:

Starter — KES 1,500/month: 1-2 users, 500 contacts
Growth — KES 3,500/month: Up to 10 users, 5,000 contacts
Agency — KES 8,500/month: Unlimited users and contacts

Free Trial: New accounts receive a 7-day free trial with full access. No credit card required to start.

Billing: Subscriptions are billed monthly. Payments are accepted via M-Pesa and credit/debit cards (Visa, Mastercard).

Late Payment: If payment is not received within 7 days of the due date, your account will be suspended. Your data will be retained for 60 days before permanent deletion.

Refunds: We do not offer refunds for partial months. If you cancel mid-month you retain access until the end of the billing period.`,
          },
          {
            title: '5. Acceptable Use Policy',
            content: `You agree NOT to use Wave CRM to:

- Send spam or unsolicited bulk messages
- Collect or store data without proper consent from your contacts
- Violate any applicable Kenyan or international laws
- Infringe on intellectual property rights
- Attempt to hack, reverse engineer or disrupt the platform
- Upload malware, viruses or harmful code
- Impersonate another person or organisation
- Engage in any fraudulent activity

We reserve the right to suspend or terminate accounts that violate this policy without refund.`,
          },
          {
            title: '6. Data Ownership',
            content: `You Own Your Data: All contacts, leads, campaigns, messages and business data you add to Wave CRM remains yours. We do not claim ownership over your data.

Our Right to Use: You grant us a limited, non-exclusive licence to store, process and display your data solely for the purpose of providing Wave CRM services.

Data Export: You may export your data at any time in CSV format. Upon account termination, you have 30 days to export your data before it is deleted.`,
          },
          {
            title: '7. Intellectual Property',
            content: `Wave CRM, including its design, code, features, branding and content, is owned by Wave Agency and protected by intellectual property laws.

You may not copy, modify, distribute or create derivative works of Wave CRM without our express written permission.

The Wave CRM name, logo and brand elements are trademarks of Wave Agency. You may not use them without permission.`,
          },
          {
            title: '8. Third-Party Integrations',
            content: `Wave CRM integrates with third-party services including WhatsApp Business API, Resend, Africa's Talking, Stripe and M-Pesa (Safaricom).

Your use of these integrations is subject to each provider's own terms of service. We are not responsible for the availability, accuracy or policies of third-party services.

WhatsApp: Use of WhatsApp messaging must comply with Meta's Business Messaging Policy. You are responsible for obtaining proper consent from contacts before messaging them.

SMS: Use of SMS features must comply with the Kenya Communications Act and industry standards for bulk messaging.`,
          },
          {
            title: '9. Service Availability',
            content: `We aim for 99.5% uptime but do not guarantee uninterrupted service. Scheduled maintenance will be communicated in advance.

We are not liable for downtime caused by:
- Third-party service outages (Supabase, Vercel, etc.)
- Force majeure events
- Internet connectivity issues outside our control
- Scheduled maintenance windows`,
          },
          {
            title: '10. Limitation of Liability',
            content: `To the maximum extent permitted by Kenyan law:

- Wave Agency's total liability to you shall not exceed the amount you paid in the 3 months preceding the claim
- We are not liable for indirect, incidental, consequential or punitive damages
- We are not liable for loss of data, revenue or business opportunities
- We are not liable for actions taken by third-party integrations

This limitation applies regardless of the legal theory under which the claim is brought.`,
          },
          {
            title: '11. Termination',
            content: `You may cancel your account at any time from Settings → Billing or by contacting us.

We may terminate or suspend your account immediately if:
- You violate these Terms of Service
- You fail to pay after a grace period
- We are required to do so by law
- Your account poses a security risk

Upon termination, your right to use Wave CRM ceases immediately. We will retain your data for 30 days to allow export before permanent deletion.`,
          },
          {
            title: '12. Governing Law and Disputes',
            content: `These Terms of Service are governed by the laws of the Republic of Kenya.

Any dispute arising from these terms shall first be attempted to be resolved through good faith negotiation. If unresolved within 30 days, disputes shall be submitted to arbitration in accordance with the Nairobi Centre for International Arbitration (NCIA) rules.

Nothing in this clause prevents either party from seeking urgent injunctive relief from Kenyan courts.`,
          },
          {
            title: '13. Changes to Terms',
            content: `We may update these Terms of Service from time to time. We will notify you of material changes by:

- Email to your registered email address at least 14 days before changes take effect
- Prominent notice within Wave CRM

Continued use of Wave CRM after changes take effect constitutes acceptance of the updated terms. If you do not agree to the new terms, you must stop using Wave CRM and cancel your account.`,
          },
          {
            title: '14. Contact Information',
            content: `For questions about these Terms of Service:

Wave Agency
Email: legal@waveagency.co.ke
Phone: +254 7XX XXX XXX
Address: Eldoret, Uasin Gishu County, Kenya
Website: waveagency.co.ke`,
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', margin: '0 0 16px' }}>
              {section.title}
            </h2>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
              {section.content}
            </div>
            {i < 13 && <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginTop: '40px' }} />}
          </div>
        ))}

        {/* Footer */}
        <div style={{ marginTop: '60px', padding: '24px', borderRadius: '16px', background: 'rgba(10,20,10,0.8)', border: '0.5px solid rgba(0,255,136,0.1)', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '0 0 16px' }}>
            Questions about our Terms of Service?
          </p>
          <a href="mailto:legal@waveagency.co.ke"
            style={{ display: 'inline-block', padding: '10px 24px', borderRadius: '10px', background: 'rgba(0,255,136,0.12)', color: '#00ff88', fontSize: '13px', fontWeight: 600, textDecoration: 'none', outline: '1px solid rgba(0,255,136,0.25)' }}>
            legal@waveagency.co.ke
          </a>
        </div>
      </div>
    </div>
  )
}