# CRITICAL STRIPE SETUP DEBUGGING GUIDE

## Issue: "STRIPE_SECRET_KEY is not configured" Error

This guide will help you systematically debug and fix the Stripe configuration issue.

---

## Step 1: Verify Your Environment File

### For Local Development:

1. **Check if `.env.local` exists** in your project root (same level as `package.json`):
   ```powershell
   # Run this in your project directory
   Test-Path .env.local
   ```
   - If it returns `False`, you need to create the file
   - If it returns `True`, continue to step 2

2. **Create `.env.local` if it doesn't exist**:
   ```powershell
   New-Item -Path .env.local -ItemType File
   ```

3. **Add your environment variables** to `.env.local`:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

   # Stripe Configuration (NO QUOTES, NO SPACES)
   STRIPE_SECRET_KEY=sk_test_your_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

   # Stripe Price IDs (get these from Stripe Dashboard after creating products)
   STRIPE_PRICE_ID_OPERATIONS_BASE=price_xxxxxxxxxxxxx
   STRIPE_PRICE_ID_MANAGEMENT_LICENSE=price_xxxxxxxxxxxxx
   STRIPE_PRICE_ID_FIELD_STAFF_LICENSE=price_xxxxxxxxxxxxx
   STRIPE_PRICE_ID_OPERATIONS_PRO_SCALE=price_xxxxxxxxxxxxx
   STRIPE_PRICE_ID_OPERATIONS_PRO_UNLIMITED=price_xxxxxxxxxxxxx

   # Resend Configuration
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

4. **CRITICAL: Check the format**:
   - ❌ WRONG: `STRIPE_SECRET_KEY="sk_test_xxx"` (has quotes)
   - ❌ WRONG: `STRIPE_SECRET_KEY = sk_test_xxx` (has spaces)
   - ✅ RIGHT: `STRIPE_SECRET_KEY=sk_test_xxx` (no quotes, no spaces)

5. **Verify your Stripe key is correct**:
   - Go to https://dashboard.stripe.com/test/apikeys
   - Copy the "Secret key" (starts with `sk_test_`)
   - Make sure you're using the TEST key, not the LIVE key
   - The key should be about 100+ characters long

---

## Step 2: Test Environment Variable Loading

1. **Restart your dev server** (MUST DO THIS):
   ```powershell
   # Stop the current dev server (Ctrl+C)
   # Then start it again:
   npm run dev
   ```

2. **Test the environment endpoint**:
   - Open your browser
   - Navigate to: `http://localhost:3000/api/test-env`
   - You should see JSON output like:
   ```json
   {
     "message": "Environment variable check",
     "nodeEnv": "development",
     "hasStripeKey": true,
     "stripeKeyPrefix": "sk_test",
     "stripeVars": {
       "STRIPE_SECRET_KEY": "sk_test_51...",
       "STRIPE_WEBHOOK_SECRET": "whsec_xxxx..."
     },
     "totalEnvVars": 15
   }
   ```

3. **Check the output**:
   - ✅ If `hasStripeKey: true` and `stripeKeyPrefix: "sk_test"` → Environment is loaded correctly
   - ❌ If `hasStripeKey: false` → Environment file is not being read

---

## Step 3: Try Signing Up Again

1. **Open your dev tools console** (F12 in Chrome/Edge)
2. **Navigate to the signup page**
3. **Watch both**:
   - Browser console for errors
   - Terminal/PowerShell where `npm run dev` is running for server logs

4. **Look for these debug messages** in the terminal:
   ```
   [Create Customer] STRIPE_SECRET_KEY check: { hasStripeKey: true, keyPrefix: 'sk_test' }
   [getStripeClient] Environment check: { hasKey: true, keyPrefix: 'sk_test', ... }
   [getStripeClient] SUCCESS: Creating Stripe client with key: sk_test
   ```

---

## Step 4: Common Issues and Fixes

### Issue 1: `.env.local` exists but variables not loading

**Solution**: Make sure your `.env.local` is in the ROOT directory:
```
Trade Control/            ← Root directory
├── .env.local           ← Should be HERE
├── package.json
├── app/
├── lib/
└── ...
```

NOT in:
- `Trade Control/Trade Control/.env.local`
- `Trade Control/app/.env.local`

### Issue 2: Variables load but still getting error

**Possible causes**:
1. **Typo in variable name**: Must be exactly `STRIPE_SECRET_KEY`
2. **Wrong Stripe key**: Using publishable key instead of secret key
   - Secret key starts with `sk_test_`
   - Publishable key starts with `pk_test_` (this is WRONG for the secret)
3. **Key not activated**: Some Stripe test keys need to be activated in dashboard

### Issue 3: Works locally but fails on Cloudflare Pages

If deploying to Cloudflare Pages:
1. Go to your Cloudflare Pages project → Settings → Environment Variables
2. Add ALL variables from `.env.local`
3. Set them for "Production", "Preview", AND "Development"
4. **Redeploy** after adding variables

---

## Step 5: Get Your Stripe Keys

If you haven't set up Stripe yet:

1. **Create Stripe Account**:
   - Go to https://stripe.com
   - Sign up / Log in
   - Toggle to "Test Mode" (top right corner)

2. **Get API Keys**:
   - Go to https://dashboard.stripe.com/test/apikeys
   - Find "Secret key" (click "Reveal test key")
   - Copy the entire key (starts with `sk_test_`)
   - Add to `.env.local` as `STRIPE_SECRET_KEY=...`

3. **Create Products** (for Price IDs):
   - Follow the ROLLOUT_GUIDE.md steps 2.1-2.5
   - This creates the products and gives you the price IDs

---

## Step 6: Still Not Working?

Run this diagnostic script in PowerShell:

```powershell
# Check if file exists
Write-Host "Checking .env.local file..." -ForegroundColor Yellow
if (Test-Path .env.local) {
    Write-Host "✓ .env.local exists" -ForegroundColor Green
    Write-Host "`nFirst few lines:" -ForegroundColor Yellow
    Get-Content .env.local | Select-Object -First 5
    Write-Host "`nStripe variables:" -ForegroundColor Yellow
    Get-Content .env.local | Select-String "STRIPE"
} else {
    Write-Host "✗ .env.local NOT FOUND!" -ForegroundColor Red
    Write-Host "Current directory:" (Get-Location) -ForegroundColor Red
    Write-Host "Create the file with: New-Item -Path .env.local -ItemType File" -ForegroundColor Yellow
}
```

---

## Quick Checklist

Before asking for more help, verify:

- [ ] `.env.local` file exists in project root
- [ ] `STRIPE_SECRET_KEY=sk_test_...` is in the file (no quotes, no spaces)
- [ ] Dev server was restarted after creating/editing `.env.local`
- [ ] `/api/test-env` shows `hasStripeKey: true`
- [ ] Browser dev tools console shows no JavaScript errors
- [ ] Terminal shows the debug logs from `[getStripeClient]`

---

## Need More Help?

1. **Visit** `/api/test-env` and copy the output
2. **Check** your terminal for the `[getStripeClient]` debug logs
3. **Copy** any error messages from browser console
4. **Share** these with the AI for further debugging

---

**Security Note**: Delete `/api/test-env/route.ts` after debugging, as it exposes information about your environment variables (though not the actual values).
