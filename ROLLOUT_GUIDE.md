# Rollout Guide: Stripe Sandbox + Resend Free Tier

This guide will walk you through setting up Trade Control for production rollout using Stripe's test mode and Resend's free tier.

## Prerequisites

- Stripe account (free to create)
- Resend account (free tier: 100 emails/day)
- Cloudflare account (for deployment)
- Supabase project (already set up)

---

## Step 1: Set Up Stripe Test Mode

### 1.1 Create Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Click **"Sign up"** and create an account
3. Complete the onboarding process

### 1.2 Get Your Test API Keys

1. In Stripe Dashboard, ensure you're in **Test mode** (toggle in top right)
2. Go to **Developers** → **API keys**
3. Copy your keys:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...` (click "Reveal test key")

### 1.3 Create Products and Prices

You need to create 5 products in Stripe that match your pricing:

#### Product 1: Operations Base
1. Go to **Products** → **Add product**
2. Name: `Operations Base`
3. Description: `Base subscription for Trade Control Operations plan`
4. Pricing:
   - Price: `$49.00 AUD`
   - Billing period: `Monthly`
   - Click **Save**
5. **Copy the Price ID** (starts with `price_...`)

#### Product 2: Management License
1. **Add product**
2. Name: `Management License`
3. Description: `Additional management user license`
4. Pricing: `$35.00 AUD` monthly
5. **Copy the Price ID**

#### Product 3: Field Staff License
1. **Add product**
2. Name: `Field Staff License`
3. Description: `Additional field staff user license`
4. Pricing: `$15.00 AUD` monthly
5. **Copy the Price ID**

#### Product 4: Operations Pro Scale
1. **Add product**
2. Name: `Operations Pro Scale`
3. Description: `Operations Pro upgrade - Scale tier`
4. Pricing: `$99.00 AUD` monthly
5. **Copy the Price ID**

#### Product 5: Operations Pro Unlimited
1. **Add product**
2. Name: `Operations Pro Unlimited`
3. Description: `Operations Pro upgrade - Unlimited tier`
4. Pricing: `$199.00 AUD` monthly
5. **Copy the Price ID**

### 1.4 Set Up Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://your-app.pages.dev/api/webhooks/stripe`
4. Events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
5. Click **Add endpoint**
6. **Copy the Signing secret** (starts with `whsec_...`)

---

## Step 2: Set Up Resend Free Tier

### 2.1 Create Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Click **"Sign up"** and create an account
3. Verify your email address

### 2.2 Get Your API Key

1. Go to **API Keys** in the dashboard
2. Click **Create API Key**
3. Name: `Trade Control Production`
4. Permission: `Full Access` (or `Sending Access` if you prefer)
5. Click **Create**
6. **Copy the API key** (starts with `re_...`)

⚠️ **Important**: You can only view the key once. Save it securely!

### 2.3 Verify Your Domain (Optional but Recommended)

For production, you should verify your domain:

1. Go to **Domains** → **Add Domain**
2. Enter your domain (e.g., `tradecontrol.app`)
3. Add the DNS records provided by Resend to your domain registrar
4. Wait for verification (can take up to 24 hours)

**For testing**, you can use Resend's default domain: `onboarding@resend.dev`

### 2.4 Set Up From Email

- If domain verified: Use `Trade Control <noreply@yourdomain.com>`
- If using Resend default: Use `Trade Control <onboarding@resend.dev>`

---

## Step 3: Update Environment Variables

### 3.1 Local Development (.env.local)

Create/update `.env.local`:

```bash
# Stripe Configuration (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Stripe Price IDs (from Step 1.3)
STRIPE_PRICE_ID_OPERATIONS_BASE=price_YOUR_PRICE_ID_HERE
STRIPE_PRICE_ID_MANAGEMENT_LICENSE=price_YOUR_PRICE_ID_HERE
STRIPE_PRICE_ID_FIELD_STAFF_LICENSE=price_YOUR_PRICE_ID_HERE
STRIPE_PRICE_ID_OPERATIONS_PRO_SCALE=price_YOUR_PRICE_ID_HERE
STRIPE_PRICE_ID_OPERATIONS_PRO_UNLIMITED=price_YOUR_PRICE_ID_HERE

# Resend Configuration
RESEND_API_KEY=re_YOUR_API_KEY_HERE
RESEND_FROM_EMAIL=Trade Control <onboarding@resend.dev>

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Subscription Pricing (in cents AUD)
OPERATIONS_BASE_PRICE=4900
MANAGEMENT_LICENSE_PRICE=3500
FIELD_STAFF_LICENSE_PRICE=1500
OPERATIONS_PRO_SCALE_PRICE=9900
OPERATIONS_PRO_UNLIMITED_PRICE=19900
```

### 3.2 Cloudflare Pages Production

1. Go to **Cloudflare Dashboard** → Pages → Your Project → **Settings** → **Environment Variables**
2. Add all the variables from above, but:
   - Use your **production Cloudflare Pages URL** for `NEXT_PUBLIC_APP_URL` (e.g., `https://your-app.pages.dev`)
   - Use your **verified domain email** for `RESEND_FROM_EMAIL` (if domain verified)
3. Set for: **Production**, **Preview**, and **Development** environments
4. **Important**: After adding variables, trigger a new deployment

---

## Step 4: Switch from Mocks to Real Services

### 4.1 Update Imports

You need to replace all imports from `stripe-mock` and `resend-mock` to use the real services.

**Find and replace in your codebase:**

```bash
# Replace stripe-mock imports
Find: from '@/lib/services/stripe-mock'
Replace: from '@/lib/services/stripe'

# Replace resend-mock imports  
Find: from '@/lib/services/resend-mock'
Replace: from '@/lib/services/resend'
```

### 4.2 Files to Update

Run these find/replace operations in:
- `app/(auth)/subscribe/page.tsx`
- `app/(protected)/subscription/manage/page.tsx`
- `app/(protected)/licenses/add/page.tsx`
- `app/(protected)/licenses/page.tsx`
- `app/(protected)/migration/page.tsx`
- `app/(protected)/jobs/[id]/quotes/page.tsx`
- `app/(protected)/jobs/[id]/invoices/page.tsx`
- `app/(protected)/jobs/[id]/assign-contractor/page.tsx`
- `app/(protected)/compliance/page.tsx`
- `app/api/webhooks/stripe/route.ts`

---

## Step 5: Install Required Packages

```bash
npm install stripe resend
```

---

## Step 6: Test the Integration

### 6.1 Test Stripe Subscription Flow

1. Start your local dev server: `npm run dev`
2. Go through the signup/subscribe flow
3. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
4. Check Stripe Dashboard → **Payments** to see the test transaction

### 6.2 Test Email Sending

1. Trigger an email (e.g., assign a license, send a quote)
2. Check Resend Dashboard → **Emails** to see sent emails
3. Verify the email arrives in the recipient's inbox

### 6.3 Test Webhooks Locally

For local webhook testing, use Stripe CLI:

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Windows: Download from https://github.com/stripe/stripe-cli/releases

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This will give you a webhook signing secret for local testing.

---

## Step 7: Deploy to Cloudflare Pages

### 7.1 Connect Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Pages** → **Create a project**
3. Connect your Git repository (GitHub/GitLab/Bitbucket)
4. Configure build settings:
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Root directory**: `/` (or your project root)

### 7.2 Add Environment Variables

1. In your Cloudflare Pages project → **Settings** → **Environment Variables**
2. Add all variables from Step 3.2
3. Set for Production, Preview, and Development environments
4. Save and trigger a new deployment

### 7.3 Verify Deployment

1. Check Cloudflare Pages deployment logs for errors
2. Test the production URL (e.g., `https://your-app.pages.dev`)
3. Verify environment variables are accessible via `/api/test-env`
4. Test Stripe webhook endpoint is accessible

---

## Step 8: Monitor and Verify

### 8.1 Stripe Dashboard

- Monitor **Payments** for successful transactions
- Check **Subscriptions** for active subscriptions
- Review **Webhooks** for successful deliveries
- Use **Logs** to debug any issues

### 8.2 Resend Dashboard

- Monitor **Emails** for delivery status
- Check **API Usage** to ensure you're within free tier limits (100/day)
- Review **Logs** for any delivery failures

### 8.3 Application Logs

- Check Cloudflare Pages deployment logs for build errors
- Monitor Cloudflare Workers logs for API route errors
- Monitor Supabase logs for database issues

---

## Troubleshooting

### Stripe Issues

**Problem**: "No such price" error
- **Solution**: Verify all `STRIPE_PRICE_ID_*` environment variables are set correctly

**Problem**: Webhook signature verification fails
- **Solution**: Ensure `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint secret

**Problem**: Test cards not working
- **Solution**: Ensure you're using Stripe test mode keys (start with `pk_test_` and `sk_test_`)

### Resend Issues

**Problem**: Emails not sending
- **Solution**: Check API key is correct and account is verified

**Problem**: "Domain not verified" error
- **Solution**: Either verify your domain or use `onboarding@resend.dev` for testing

**Problem**: Rate limit exceeded
- **Solution**: Free tier is 100 emails/day. Upgrade to Resend Pro for more

### General Issues

**Problem**: Environment variables not loading
- **Solution**: Trigger a new Cloudflare Pages deployment after adding env vars
- **Solution**: Verify variables are set for the correct environment (Production/Preview)

**Problem**: Import errors after switching services
- **Solution**: Ensure all files are updated and packages are installed

---

## Next Steps After Testing

Once everything works in test mode:

1. **Switch to Stripe Live Mode**:
   - Get live API keys from Stripe Dashboard
   - Update environment variables
   - Create live products/prices
   - Update webhook endpoint

2. **Upgrade Resend** (if needed):
   - If you exceed 100 emails/day, upgrade to Resend Pro
   - Verify your production domain
   - Update `RESEND_FROM_EMAIL` to use your domain

3. **Monitor Production**:
   - Set up error tracking (Sentry, etc.)
   - Monitor Stripe and Resend dashboards daily
   - Set up alerts for failed payments/emails

---

## Quick Reference

### Stripe Test Cards

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

### Resend Limits (Free Tier)

- **Emails per day**: 100
- **Emails per month**: 3,000
- **API requests**: Unlimited

### Support Resources

- Stripe Docs: https://stripe.com/docs
- Resend Docs: https://resend.com/docs
- Stripe Support: Available in dashboard
- Resend Support: support@resend.com

---

## Checklist

- [ ] Stripe account created
- [ ] Stripe test API keys obtained
- [ ] Stripe products and prices created
- [ ] Stripe webhook endpoint configured
- [ ] Resend account created
- [ ] Resend API key obtained
- [ ] Resend domain verified (optional)
- [ ] Environment variables set locally
- [ ] Environment variables set in Cloudflare Pages
- [ ] Code updated to use real services
- [ ] Packages installed (`stripe`, `resend`)
- [ ] Local testing completed
- [ ] Webhook testing completed
- [ ] Deployed to Cloudflare Pages
- [ ] Production testing completed
- [ ] Monitoring set up

---

**You're ready to roll out! 🚀**
