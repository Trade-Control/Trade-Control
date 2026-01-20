# Trade Control - Deployment Guide

This guide walks through deploying Trade Control to production.

## Prerequisites

Before deploying, ensure you have:

- [ ] Supabase project created and configured
- [ ] Stripe account with products and prices configured
- [ ] Resend account with verified domain
- [ ] (Optional) Google Maps API key
- [ ] Vercel/Netlify account (or other hosting)

## Step 1: Supabase Setup

### 1.1 Create Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Choose a region close to your users (e.g., Sydney for Australian users)
4. Note your project URL and API keys

### 1.2 Run Database Migrations

1. Go to SQL Editor in Supabase dashboard
2. Create a new query
3. Copy contents of `supabase/migrations/20240101000000_initial_schema.sql`
4. Run the query
5. Repeat for `supabase/migrations/20240101000001_rls_policies.sql`

### 1.3 Configure Storage (Optional)

If implementing document uploads:

1. Go to Storage in Supabase dashboard
2. Create bucket: `documents`
3. Create bucket: `contractor-submissions`
4. Set RLS policies on buckets to match database policies

### 1.4 Configure Auth

1. Go to Authentication → Settings
2. Configure Site URL: `https://yourdomain.com`
3. Add Redirect URLs:
   - `https://yourdomain.com/auth/callback`
   - `https://yourdomain.com/onboarding`
4. **Configure email templates (REQUIRED for signup):**
   - Go to Authentication → Email Templates
   - Edit "Confirm signup" template
   - Ensure confirmation URL redirects to: `https://yourdomain.com/auth/callback`
   - **Email verification must be enabled** for the signup flow to work correctly

## Step 2: Stripe Setup

### 2.1 Create Products

Create the following products in your Stripe Dashboard:

**1. Operations Base Plan**
- Name: Trade Control - Operations
- Billing: Recurring, Monthly
- Price: $49 AUD
- Copy Price ID → `STRIPE_OPERATIONS_PRICE_ID`

**2. Operations Pro Scale Addon**
- Name: Trade Control - Operations Pro Scale Addon
- Billing: Recurring, Monthly
- Price: $99 AUD
- Copy Price ID → `STRIPE_OPERATIONS_PRO_SCALE_ADDON_PRICE_ID`

**3. Operations Pro Unlimited Addon**
- Name: Trade Control - Operations Pro Unlimited Addon
- Billing: Recurring, Monthly
- Price: $199 AUD
- Copy Price ID → `STRIPE_OPERATIONS_PRO_UNLIMITED_ADDON_PRICE_ID`

**4. Management License**
- Name: Trade Control - Management License
- Billing: Recurring, Monthly
- Price: $35 AUD
- Copy Price ID → `STRIPE_MANAGEMENT_LICENSE_PRICE_ID`

**5. Field Staff License**
- Name: Trade Control - Field Staff License
- Billing: Recurring, Monthly
- Price: $15 AUD
- Copy Price ID → `STRIPE_FIELD_STAFF_LICENSE_PRICE_ID`

### 2.2 Configure Webhook

1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy "Signing secret" → `STRIPE_WEBHOOK_SECRET`

## Step 3: Resend Setup

1. Go to [resend.com](https://resend.com)
2. Add and verify your domain
3. Create API key → `RESEND_API_KEY`
4. Note your verified sending email → `RESEND_FROM_EMAIL`

## Step 4: Google Maps Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable APIs:
   - Maps JavaScript API
   - Places API
   - Routes API
4. Create API key with restrictions:
   - Restrict to your domain
   - Enable only required APIs
5. Copy API key → `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

## Step 5: Environment Variables

Create a `.env.production` file or configure in your hosting platform:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
STRIPE_OPERATIONS_PRICE_ID=price_...
STRIPE_OPERATIONS_PRO_SCALE_ADDON_PRICE_ID=price_...
STRIPE_OPERATIONS_PRO_UNLIMITED_ADDON_PRICE_ID=price_...
STRIPE_MANAGEMENT_LICENSE_PRICE_ID=price_...
STRIPE_FIELD_STAFF_LICENSE_PRICE_ID=price_...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Google Maps (Optional)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Step 6: Deploy to Vercel

### 6.1 Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Import your Git repository
3. Configure project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 6.2 Configure Environment Variables

1. Go to Settings → Environment Variables
2. Add all variables from `.env.production`
3. Make sure to select the correct environments (Production, Preview, Development)

### 6.3 Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Visit your deployment URL

### 6.4 Configure Custom Domain

1. Go to Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` to your custom domain
5. Update Stripe webhook URL to use custom domain
6. Update Supabase redirect URLs to use custom domain

## Step 7: Post-Deployment Checks

### 7.1 Test Signup Flow

1. Go to `/signup`
2. Create a test account
3. Complete Stripe checkout (use test card: 4242 4242 4242 4242)
4. Verify webhook triggers and creates organization
5. Complete onboarding
6. Check dashboard loads correctly

### 7.2 Test Stripe Webhook

```bash
# Send a test webhook from Stripe Dashboard
# Check Vercel logs for webhook processing
vercel logs
```

### 7.3 Test Authentication

1. Logout
2. Login with created account
3. Verify redirect to dashboard
4. Test protected routes

### 7.4 Test Database Access

1. Create a job
2. Create a contact
3. Add inventory item
4. Check data appears in Supabase dashboard

## Step 8: Monitoring & Maintenance

### 8.1 Setup Error Tracking

Consider integrating:
- Sentry for error tracking
- Vercel Analytics for performance
- LogRocket for session replay

### 8.2 Setup Alerts

Configure alerts for:
- Failed Stripe webhooks
- Database connection issues
- High error rates
- Performance degradation

### 8.3 Backup Strategy

- Supabase provides automatic daily backups (Pro plan)
- Consider additional backup strategy for critical data
- Test restore procedures

### 8.4 Security Checklist

- [ ] All environment variables are secret
- [ ] Stripe keys are live keys (not test)
- [ ] Webhook signature verification is working
- [ ] RLS policies are applied to all tables
- [ ] HTTPS is enforced
- [ ] CORS is configured correctly
- [ ] Rate limiting is in place (if implemented)

## Step 9: Going Live

### 9.1 Switch to Production Mode

1. Update all test API keys to live keys
2. Test with real payment (small amount)
3. Verify webhook processing
4. Check email delivery

### 9.2 Create First User

1. Signup for an account
2. Complete trial or payment
3. Verify all features work as expected

### 9.3 Monitor for Issues

Watch for:
- Failed payments
- Webhook errors
- User signup issues
- Performance problems

## Rollback Plan

If issues occur:

1. Revert to previous deployment in Vercel
2. Check Supabase database for data integrity
3. Verify Stripe webhook configuration
4. Review error logs for root cause

## Support Checklist

- [ ] Document common issues and solutions
- [ ] Setup support email/system
- [ ] Create user documentation
- [ ] Prepare FAQ
- [ ] Setup customer communication channels

## Performance Optimization

Post-deployment optimizations:

1. Enable Vercel Edge Functions for API routes
2. Implement caching strategies
3. Optimize database queries
4. Add database indexes based on usage patterns
5. Implement CDN for static assets
6. Enable compression

## Compliance (Australian Context)

Ensure compliance with:
- Privacy Act 1988
- Australian Consumer Law
- PCI DSS (for payment handling via Stripe)
- Data residency requirements (use Australian Supabase region)

## Costs Estimate

Monthly costs (approximate):

- Supabase: $25 USD (Pro plan with Australian region)
- Vercel: $20 USD (Pro plan)
- Stripe: 1.75% + 30¢ per transaction
- Resend: $20 USD (10,000 emails/month)
- Google Maps: Pay as you go (first $200/month free)

**Total**: ~$65 USD + transaction fees + usage-based costs

---

## Troubleshooting

### Webhook Not Firing

1. Check Stripe dashboard for webhook attempts
2. Verify webhook URL is correct
3. Check Vercel logs for errors
4. Ensure `STRIPE_WEBHOOK_SECRET` is correct

### Database Connection Issues

1. Verify Supabase URL and keys are correct
2. Check Supabase project status
3. Review RLS policies for blocking queries
4. Check Vercel logs for connection errors

### Authentication Not Working

1. Verify redirect URLs in Supabase
2. Check middleware configuration
3. Ensure cookies are not blocked
4. Review auth flow in browser network tab

---

**Need Help?** Refer to official documentation:
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Vercel Documentation](https://vercel.com/docs)
