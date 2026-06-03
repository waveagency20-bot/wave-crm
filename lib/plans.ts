// ---------------------------------------------------------------------------
// Wave CRM Plan definitions
// Single source of truth for plan names, prices, and limits.
// Import this wherever plans are displayed or checked.
// ---------------------------------------------------------------------------
export const PLANS = [
  {
    id:       'starter',
    name:     'Starter',
    price:    'KES 3,500',
    priceRaw: 3500,
    per:      '/month',
    color:    '#818cf8',
    desc:     '1-3 users · 500 contacts',
    smsCredits: 500,
    maxUsers:   3,
    maxContacts: 500,
    popular:  false,
  },
  {
    id:       'growth',
    name:     'Growth',
    price:    'KES 8,500',
    priceRaw: 8500,
    per:      '/month',
    color:    '#00ff88',
    desc:     'Up to 10 users · 5,000 contacts',
    smsCredits: 2000,
    maxUsers:   10,
    maxContacts: 5000,
    popular:  true,
  },
  {
    id:       'enterprise',
    name:     'Enterprise',
    price:    'KES 16,500',
    priceRaw: 16500,
    per:      '/month',
    color:    '#fbbf24',
    desc:     'Unlimited users & contacts',
    smsCredits: 5000,
    maxUsers:   null,
    maxContacts: null,
    popular:  false,
  },
]