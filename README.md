# Trade Control - Subscription System Setup Guide

## 🚀 Quick Start

This guide will help you set up the complete subscription management system with role-based access control, contractor management, and email integration.

## Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Access to your Supabase SQL Editor

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

All required packages (`nanoid`, `@supabase/ssr`, etc.) are already in `package.json`.

### 2. Set Up Environment Variables

Copy the template and fill in your values:

```bash
# Create .env.local file
cp ENV_TEMPLATE.md .env.local
```

Edit `.env.local` with your values:

```env
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe Mock (leave as-is for testing, replace for production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_mock
STRIPE_SECRET_KEY=sk_test_mock
STRIPE_WEBHOOK_SECRET=whsec_mock

# Resend Mock (leave as-is for testing, replace for production)
RESEND_API_KEY=re_mock_key
RESEND_FROM_EMAIL=Trade Control <noreply@tradecontrol.app>

# Subscription Pricing (in cents AUD)
OPERATIONS_BASE_PRICE=4900
MANAGEMENT_LICENSE_PRICE=3500
FIELD_STAFF_LICENSE_PRICE=1500
OPERATIONS_PRO_SCALE_PRICE=9900
OPERATIONS_PRO_UNLIMITED_PRICE=19900

# Google Maps (optional)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

### 3. Run Database Migration

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy the contents of `supabase/migrations/003_subscription_system.sql`
4. Paste and run the entire SQL file

This will create:
- 7 new tables (subscriptions, licenses, contractors, etc.)
- Row Level Security (RLS) policies
- Helper functions
- Indexes for performance
- Storage bucket for contractor submissions

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## 🎯 Testing the System

### Testing Subscription Flow

1. **New User Signup**
   - Visit `/get-started`
   - Choose a plan (Operations or Operations Pro)
   - Click "Choose Plan"
   - Fill in account details
   - Complete onboarding (mock payment)

2. **View Mock Logs**
   - Open browser console
   - Look for 🔵 (Stripe) and 📧 (Resend) emoji logs
   - All operations are logged but no real API calls are made

3. **Test Role-Based Access**
   - As Owner: Access all features
   - Add Management License: Test job management
   - Add Field Staff License: Test limited access

### Testing Contractor Management (Operations Pro)

1. **Upgrade to Operations Pro**
   - Go to Subscription page
   - Click "Upgrade to Operations Pro"

2. **Add Contractors**
   - Go to Contractors page
   - Add contractor with compliance info
   - Set insurance/license expiry dates

3. **Test Compliance Shield**
   - Go to Compliance page
   - View contractors expiring soon
   - Send reminder emails (check console logs)

4. **Assign Contractor to Job**
   - Create or open a job
   - Assign contractor
   - Contractor receives email with token link

5. **Test Contractor Access**
   - Copy the token URL from logs
   - Open in incognito window
   - View job details
   - Submit progress/completion

## 📁 Project Structure

```
Trade Control/
├── app/
│   ├── (auth)/
│   │   ├── get-started/          # Landing page with plans
│   │   ├── subscribe/             # Subscription signup
│   │   ├── onboarding/            # Business onboarding
│   │   ├── login/                 # Login page
│   │   └── signup/                # Signup page
│   ├── (protected)/
│   │   ├── dashboard/             # Main dashboard
│   │   ├── jobs/                  # Job management
│   │   ├── licenses/              # License management (Owner)
│   │   │   └── add/               # Add new license
│   │   ├── subscription/
│   │   │   └── manage/            # Subscription management (Owner)
│   │   ├── contractors/           # Contractor management (Pro)
│   │   ├── compliance/            # Compliance dashboard (Pro)
│   │   ├── my-jobs/               # Field staff jobs
│   │   ├── migration/             # Existing user migration
│   │   └── ...                    # Other existing pages
│   └── contractor-access/
│       └── [token]/               # Public contractor access
│           ├── page.tsx           # Job details
│           └── submit/            # Submit progress
├── lib/
│   ├── middleware/
│   │   ├── role-check.ts          # Client-side RBAC
│   │   └── role-check-server.ts  # Server-side RBAC
│   ├── services/
│   │   ├── stripe-mock.ts         # Stripe mock service
│   │   └── resend-mock.ts         # Resend mock service
│   ├── types/
│   │   └── database.types.ts      # TypeScript types
│   └── supabase/                  # Supabase clients
├── components/
│   └── layout/
│       └── Sidebar.tsx            # Role-based navigation
└── supabase/
    └── migrations/
        └── 003_subscription_system.sql  # Database schema
```

## 🔐 Role-Based Access Control

### Owner / License Manager
- **Full access** to all features
- Manage licenses and subscriptions
- View all jobs and data
- Assign field staff to jobs

### Management Login ($35/mo)
- Manage jobs, quotes, invoices
- Assign contractors (if Operations Pro)
- View all organization data
- **Cannot** manage licenses or subscriptions

### Field Staff ($15/mo)
- View **only assigned jobs**
- Update job status and notes
- Upload photos
- **Cannot** access quotes, invoices, or other jobs

### External Contractors (Operations Pro)
- Access via token-based link
- View specific job details
- Submit progress and invoices
- **No login required**

## 📊 Subscription Tiers

### Operations ($49/mo)
- Job management
- Quotes & invoices
- Timesheets & documents
- Inventory & travel tracking
- **Add-ons:**
  - Management: $35/mo each
  - Field Staff: $15/mo each

### Operations Pro ($49 + $99 or $199/mo)
- **Everything in Operations, plus:**
- Contractor management
- Compliance Shield (auto-flagging)
- Email job assignments
- Token-based access
- Activity feed

**Pro Levels:**
- Scale: Up to 50 contractors (+$99/mo)
- Unlimited: Unlimited contractors (+$199/mo)

## 🎨 Key Features

### 1. Subscription Management
- ✅ 14-day free trial
- ✅ Pro-rata billing for mid-cycle changes
- ✅ Upgrade/downgrade anytime
- ✅ Add/remove licenses dynamically

### 2. License Management
- ✅ Owner, Management, Field Staff types
- ✅ Assign to existing or new users
- ✅ Track monthly costs
- ✅ Unassign and reassign

### 3. Contractor Management (Pro)
- ✅ Add contractors with compliance info
- ✅ Track insurance/license expiry
- ✅ Auto-flag expired credentials
- ✅ Send reminder emails
- ✅ Compliance dashboard

### 4. Token-Based Access
- ✅ Secure access for contractors
- ✅ No login required
- ✅ Time-limited tokens (30 days)
- ✅ Submit progress and invoices

### 5. Email Integration
- ✅ Job assignment emails
- ✅ Quote and invoice emails
- ✅ Compliance reminders
- ✅ Activity logging

### 6. Activity Feed
- ✅ Chronological log
- ✅ Email communications
- ✅ Status changes
- ✅ Contractor submissions

## 🔄 Migration Path for Existing Users

If you have existing users without subscriptions:

1. Users will be redirected to `/migration` on login
2. They can choose a plan with a 14-day trial
3. Existing users are automatically made "Owner"
4. All data is preserved

## 🚀 Going to Production

### Replace Mock Services

#### 1. Stripe Setup
```bash
# Get your Stripe keys from dashboard.stripe.com
# Update .env.local:
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Create products in Stripe:
- Operations Base: $49 AUD/month
- Management License: $35 AUD/month
- Field Staff License: $15 AUD/month
- Operations Pro Scale: $99 AUD/month
- Operations Pro Unlimited: $199 AUD/month

#### 2. Resend Setup
```bash
# Get your Resend key from resend.com
# Update .env.local:
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Your Company <noreply@yourdomain.com>
```

Verify your domain in Resend dashboard.

#### 3. Replace Mock Functions

Option A: Update the existing mock files to call real APIs
- Edit `lib/services/stripe-mock.ts` to use real Stripe SDK
- Edit `lib/services/resend-mock.ts` to use real Resend SDK

Option B: Create new service files
- Create `lib/services/stripe.ts` with real implementations
- Create `lib/services/resend.ts` with real implementations
- Update imports across the app

### Set Up Stripe Webhooks

1. In Stripe dashboard, add webhook endpoint:
   ```
   https://yourdomain.com/api/webhooks/stripe
   ```

2. Create webhook handler: `app/api/webhooks/stripe/route.ts`

3. Listen for events:
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

## 🧪 Testing Checklist

- [ ] New user signup with trial
- [ ] Complete onboarding flow
- [ ] Add management license
- [ ] Add field staff license
- [ ] Assign licenses to users
- [ ] Test role-based navigation
- [ ] Field staff sees only assigned jobs
- [ ] Upgrade to Operations Pro
- [ ] Add contractors
- [ ] Assign contractor to job
- [ ] Test contractor token access
- [ ] Submit contractor progress
- [ ] Review submissions
- [ ] Check compliance dashboard
- [ ] Send compliance reminders
- [ ] View activity feed
- [ ] Cancel subscription
- [ ] Test existing user migration

## 📝 Database Schema Overview

### Core Tables
- `subscriptions` - Organization subscriptions
- `licenses` - User licenses (owner, management, field_staff)
- `contractors` - External contractors
- `contractor_job_assignments` - Job assignments with tokens
- `contractor_submissions` - Work submissions
- `email_communications` - Email log
- `activity_feed` - Activity timeline

### Modified Tables
- `profiles` - Added role, license_id, assigned_job_ids
- `organizations` - Added subscription_id, onboarding_completed

## 🔒 Security Features

- ✅ Row Level Security (RLS) on all tables
- ✅ Role-based access enforcement
- ✅ Secure token generation (32-char random)
- ✅ Token expiry (30 days default)
- ✅ Organization data isolation
- ✅ Server-side permission checks

## 🐛 Troubleshooting

### "Event handlers cannot be passed to Client Component props"
- Ensure client components have `'use client'` directive
- Check imports don't mix server and client code
- See fixed `role-check.ts` vs `role-check-server.ts`

### Subscription not found
- Run the database migration
- Check organization has subscription_id set
- Verify RLS policies are enabled

### Contractor can't access job
- Check token hasn't expired
- Verify token_expires_at > NOW()
- Check RLS policy allows anon access

### Mock services not logging
- Open browser console (F12)
- Look for 🔵 (Stripe) and 📧 (Resend) emojis
- Check network tab for errors

## 📚 Additional Resources

- [Next.js 15 App Router Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Stripe API Docs](https://stripe.com/docs/api)
- [Resend Docs](https://resend.com/docs)

## 💡 Tips

1. **Start with mock mode** - Test everything before adding real APIs
2. **Check console logs** - All mock calls are logged
3. **Use trial period** - Test subscription flow without charges
4. **Test all roles** - Create test users for each role type
5. **Review RLS policies** - Ensure data is properly isolated

## 🎉 You're Ready!

The subscription system is now fully integrated. Start by visiting `/get-started` and test the complete flow. All features work in mock mode, so you can develop and test without real API keys.

## Support

For issues or questions:
1. Check `IMPLEMENTATION_PROGRESS.md` for implementation status
2. Review database migration for schema details
3. Check console logs for mock service calls
4. Verify environment variables are set correctly

Happy building! 🚀
