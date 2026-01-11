# VERCEL DEPLOYMENT - STRIPE CONFIGURATION GUIDE

## Critical Issue: Environment Variables on Vercel

You're deploying to Vercel, which means environment variables must be configured in the Vercel dashboard, NOT in a local `.env.local` file.

---

## Step 1: Add Environment Variables to Vercel

1. **Go to your Vercel project**:
   - Open https://vercel.com/dashboard
   - Find your "Trade Control" project
   - Click on it

2. **Navigate to Settings**:
   - Click "Settings" tab at the top
   - Click "Environment Variables" in the left sidebar

3. **Add STRIPE_SECRET_KEY**:
   - Click "Add New" button
   - **Name**: `STRIPE_SECRET_KEY`
   - **Value**: Your Stripe test secret key (starts with `sk_test_`)
   - **Environments**: Check ALL three boxes:
     - ✅ Production
     - ✅ Preview  
     - ✅ Development
   - Click "Save"

4. **Add all other required variables**:

   ```
   STRIPE_SECRET_KEY=sk_test_your_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   
   STRIPE_PRICE_ID_OPERATIONS_BASE=price_xxxxx
   STRIPE_PRICE_ID_MANAGEMENT_LICENSE=price_xxxxx
   STRIPE_PRICE_ID_FIELD_STAFF_LICENSE=price_xxxxx
   STRIPE_PRICE_ID_OPERATIONS_PRO_SCALE=price_xxxxx
   STRIPE_PRICE_ID_OPERATIONS_PRO_UNLIMITED=price_xxxxx
   
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
   SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
   
   RESEND_API_KEY=re_xxxxx
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

5. **IMPORTANT**: For each variable:
   - Enter the Name (e.g., `STRIPE_SECRET_KEY`)
   - Enter the Value (the actual key)
   - Check ALL THREE environment checkboxes (Production, Preview, Development)
   - Click Save

---

## Step 2: Redeploy Your Application

**Critical**: After adding environment variables, you MUST redeploy!

### Option A: Redeploy via Dashboard
1. Go to your project's "Deployments" tab
2. Find the latest deployment
3. Click the three dots menu (⋮)
4. Click "Redeploy"
5. Confirm the redeploy

### Option B: Redeploy via Git Push
```powershell
git add .
git commit -m "Add Stripe debug logging"
git push
```

Vercel will automatically redeploy when you push to your repository.

---

## Step 3: Verify Environment Variables Are Loaded

After redeploying, visit your test endpoint:

**URL**: `https://your-app.vercel.app/api/test-env`

You should see:
```json
{
  "message": "Environment variable check",
  "nodeEnv": "production",
  "hasStripeKey": true,
  "stripeKeyPrefix": "sk_test",
  "stripeVars": {
    "STRIPE_SECRET_KEY": "sk_test_51...",
    "STRIPE_WEBHOOK_SECRET": "whsec_xxxx..."
  },
  "totalEnvVars": 12
}
```

✅ If `hasStripeKey: true` → Environment is configured correctly!
❌ If `hasStripeKey: false` → Variables not loaded, check Step 1 again

---

## Step 4: Test Signup Flow

1. Visit: `https://your-app.vercel.app/subscribe`
2. Try signing up
3. Check Vercel logs for debug output:
   - Go to your Vercel project
   - Click "Deployments" tab
   - Click on the latest deployment
   - Click "Functions" tab
   - Look for logs from `/api/subscriptions/create-customer`

You should see in the logs:
```
[Create Customer] STRIPE_SECRET_KEY check: { hasStripeKey: true, keyPrefix: 'sk_test' }
[getStripeClient] Environment check: { hasKey: true, keyPrefix: 'sk_test', ... }
[getStripeClient] SUCCESS: Creating Stripe client
```

---

## Common Vercel Issues

### Issue 1: "STRIPE_SECRET_KEY is not configured" after adding it

**Cause**: You didn't redeploy after adding the variable

**Solution**: 
- Environment variables are only loaded during deployment
- Go to Deployments → Click latest → Redeploy
- OR push a new commit to trigger redeploy

### Issue 2: Variables work in Production but not Preview

**Cause**: You only checked "Production" when adding the variable

**Solution**:
1. Go to Settings → Environment Variables
2. Find `STRIPE_SECRET_KEY`
3. Click the pencil/edit icon
4. Make sure ALL THREE boxes are checked:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Save
6. Redeploy

### Issue 3: Can't find Stripe keys

**Get your Stripe test keys**:
1. Go to https://dashboard.stripe.com
2. Toggle to "Test Mode" (switch in top-right corner)
3. Go to Developers → API keys
4. Copy "Secret key" (click "Reveal test key")
5. It should start with `sk_test_` and be ~100 characters

### Issue 4: Webhook URL issues

For Stripe webhooks, use:
- **Webhook URL**: `https://your-app.vercel.app/api/webhooks/stripe`
- Get the signing secret from Stripe dashboard and add as `STRIPE_WEBHOOK_SECRET`

---

## Quick Checklist for Vercel

Before trying again:

- [ ] Added `STRIPE_SECRET_KEY` to Vercel Environment Variables
- [ ] Checked ALL THREE environment boxes (Production, Preview, Development)
- [ ] Saved the variable
- [ ] Redeployed the application (via dashboard or git push)
- [ ] Waited for deployment to complete (check status in Deployments tab)
- [ ] Visited `/api/test-env` to verify `hasStripeKey: true`
- [ ] Tried signup flow again

---

## How to View Vercel Logs (to see debug output)

1. Go to your Vercel project dashboard
2. Click "Deployments" tab
3. Click on the most recent deployment
4. Click "Functions" tab
5. Click on any function to see its logs (e.g., `/api/subscriptions/create-customer`)
6. Look for the `[getStripeClient]` and `[Create Customer]` debug logs

These logs will show you exactly what's happening with the environment variables.

---

## Still Not Working?

1. **Check your Vercel deployment status**:
   - Go to Deployments tab
   - Make sure latest deployment shows "Ready" status
   - If it shows "Error", click it to see what failed

2. **View the function logs**:
   - Deployments → Latest → Functions → `/api/subscriptions/create-customer`
   - Copy the error logs

3. **Check environment variables are actually set**:
   - Settings → Environment Variables
   - Screenshot the list (blur out the values)
   - Verify `STRIPE_SECRET_KEY` is in the list

4. **Try the test endpoint** and share the output:
   - Visit: `https://your-app.vercel.app/api/test-env`
   - Copy the JSON response

---

## Next Steps After Fixing

Once environment variables are working:

1. **Delete the test endpoint** (security):
   ```powershell
   Remove-Item app/api/test-env/route.ts
   git add .
   git commit -m "Remove test endpoint"
   git push
   ```

2. **Complete Stripe setup** following ROLLOUT_GUIDE.md:
   - Create products in Stripe dashboard
   - Get the Price IDs
   - Add them to Vercel environment variables
   - Redeploy

3. **Set up Stripe webhook**:
   - In Stripe dashboard: Developers → Webhooks
   - Add endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
   - Select events to listen for
   - Copy signing secret to `STRIPE_WEBHOOK_SECRET` in Vercel

---

**Remember**: Every time you add or change an environment variable in Vercel, you MUST redeploy for the changes to take effect!
