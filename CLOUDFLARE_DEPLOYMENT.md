# Cloudflare Pages Deployment Guide

This guide covers deploying Trade Control to Cloudflare Pages.

## Prerequisites

- Cloudflare account (free tier available)
- Git repository (GitHub, GitLab, or Bitbucket)
- All environment variables configured (see `ENV_TEMPLATE.md`)

## Step 1: Create Cloudflare Pages Project

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Pages** → **Create a project**
3. Click **Connect to Git**
4. Select your Git provider (GitHub/GitLab/Bitbucket)
5. Authorize Cloudflare to access your repositories
6. Select the `Trade-Control` repository
7. Click **Begin setup**

## Step 2: Configure Build Settings

Configure your build settings:

- **Project name**: `trade-control` (or your preferred name)
- **Production branch**: `main` (or `master`)
- **Framework preset**: `Next.js`
- **Build command**: `npm run build`
- **Build output directory**: `.next`
- **Root directory**: `/` (leave empty if project is at root)

Click **Save and Deploy**

## Step 3: Add Environment Variables

1. In your Cloudflare Pages project, go to **Settings** → **Environment Variables**
2. Click **Add variable** for each environment variable
3. Add all variables from `ENV_TEMPLATE.md`:

### Required Variables

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

STRIPE_PRICE_ID_OPERATIONS_BASE=price_...
STRIPE_PRICE_ID_MANAGEMENT_LICENSE=price_...
STRIPE_PRICE_ID_FIELD_STAFF_LICENSE=price_...
STRIPE_PRICE_ID_OPERATIONS_PRO_SCALE=price_...
STRIPE_PRICE_ID_OPERATIONS_PRO_UNLIMITED=price_...

RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Trade Control <onboarding@resend.dev>

NEXT_PUBLIC_APP_URL=https://your-app.pages.dev

OPERATIONS_BASE_PRICE=4900
MANAGEMENT_LICENSE_PRICE=3500
FIELD_STAFF_LICENSE_PRICE=1500
OPERATIONS_PRO_SCALE_PRICE=9900
OPERATIONS_PRO_UNLIMITED_PRICE=19900
```

4. For each variable, select which environments it applies to:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. Click **Save**

## Step 4: Configure Custom Domain (Optional)

1. Go to **Custom domains** in your project settings
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `tradecontrol.app`)
4. Follow DNS configuration instructions
5. Cloudflare will automatically provision SSL certificates

## Step 5: Configure Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://your-app.pages.dev/api/webhooks/stripe`
   - Or use your custom domain: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)
7. Add it to Cloudflare Pages environment variables as `STRIPE_WEBHOOK_SECRET`

## Step 6: Trigger Deployment

After adding environment variables:

1. Go to **Deployments** tab
2. Click **Retry deployment** on the latest deployment
3. Or push a new commit to trigger automatic deployment

## Step 7: Verify Deployment

1. **Check Build Logs**:
   - Go to **Deployments** → Click on latest deployment
   - Review build logs for any errors

2. **Test Environment Variables**:
   - Visit: `https://your-app.pages.dev/api/test-env`
   - Should show environment variables are loaded

3. **Test Application**:
   - Visit your production URL
   - Test signup/subscription flow
   - Verify Stripe integration works

4. **Test Webhooks**:
   - Trigger a test event in Stripe Dashboard
   - Check Cloudflare Workers logs for webhook processing

## Troubleshooting

### Build Fails

**Problem**: Build errors during deployment
- **Solution**: Check build logs for specific errors
- **Solution**: Ensure `package.json` has all required dependencies
- **Solution**: Verify Node.js version compatibility (Cloudflare Pages uses Node.js 18+)

### Environment Variables Not Loading

**Problem**: API routes return undefined for env vars
- **Solution**: Verify variables are set for Production environment
- **Solution**: Trigger a new deployment after adding variables
- **Solution**: Check variable names match exactly (case-sensitive)

### API Routes Not Working

**Problem**: API routes return 404 or errors
- **Solution**: Verify routes are in `app/api/` directory
- **Solution**: Check route handlers export correct HTTP methods (GET, POST, etc.)
- **Solution**: Review Cloudflare Workers logs for runtime errors

### Stripe Webhooks Failing

**Problem**: Webhook signature verification fails
- **Solution**: Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- **Solution**: Ensure webhook URL in Stripe matches your Cloudflare Pages URL
- **Solution**: Check Cloudflare Workers logs for detailed error messages

## Monitoring

### Cloudflare Pages Logs

1. Go to **Deployments** → Select a deployment
2. Click **View build logs** for build-time errors
3. Check **Workers** logs for runtime errors

### Stripe Dashboard

- Monitor webhook deliveries in **Developers** → **Webhooks**
- Check payment/subscription status in respective sections

### Application Monitoring

Consider setting up:
- Error tracking (Sentry, etc.)
- Uptime monitoring
- Performance monitoring

## Continuous Deployment

Cloudflare Pages automatically deploys on:
- Push to production branch (main/master)
- Pull requests (creates preview deployments)

Preview deployments use Preview environment variables, allowing you to test changes before merging.

## Next Steps

After successful deployment:

1. Test all critical flows (signup, subscription, payments)
2. Monitor error logs for the first few days
3. Set up alerts for critical failures
4. Consider adding custom domain for production
5. Review Cloudflare Pages analytics for performance insights

---

**Need Help?**
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Next.js on Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
