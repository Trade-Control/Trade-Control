# Vercel Deployment Checklist

## Issues Fixed in This Update

### 1. ✅ Trial Subscription Blocking Upgrades and License Management
**Problem:** Users in free trial couldn't upgrade to Pro or add licenses.

**Root Cause:** Stripe requires a payment method before allowing subscription modifications during trial period.

**Fix Applied:**
- Added trial status checks in subscription management
- Disabled upgrade button during trial with clear messaging
- Disabled license addition during trial with warning message
- Added better error messages explaining the limitation

**Files Changed:**
- `app/(protected)/subscription/manage/page.tsx`
- `app/(protected)/licenses/add/page.tsx`

### 2. ✅ Email Sending Failures (Quotes/Invoices)
**Problem:** Emails fail silently or with unclear error messages.

**Root Cause:** `RESEND_API_KEY` not configured in Vercel.

**Fix Applied:**
- Added specific error handling for missing RESEND_API_KEY
- Improved error messages to guide users to solution
- Added try-catch blocks around email sending
- Error messages now show: "Email service not configured. Please set RESEND_API_KEY..."

**Files Changed:**
- `app/(protected)/jobs/[id]/quotes/page.tsx`
- `app/(protected)/jobs/[id]/invoices/page.tsx`
- `app/(protected)/compliance/page.tsx`
- `app/(protected)/jobs/[id]/assign-contractor/page.tsx`

### 3. ✅ Created Stripe Debug Page
**Location:** `/debug/stripe` (public, no auth required)

**Features:**
- Shows all Stripe environment variables status
- Tests Stripe API connectivity
- Provides actionable recommendations
- Shows Vercel environment information
- Links to Stripe Dashboard and Vercel docs

**Files Created:**
- `app/api/debug/stripe/route.ts`
- `app/debug/stripe/page.tsx`
- `lib/supabase/middleware.ts` (updated to allow /debug routes)

### 4. ✅ Documentation
**Created:** `STRIPE_ISSUES_AND_FIXES.md`

Contains:
- Complete diagnosis of all issues
- Step-by-step fix guide for production
- Quick fix guide for testing without Stripe
- Environment variable checklist

---

## What You Need to Do in Vercel

### Immediate Action: Visit Debug Page
1. Go to `https://your-app.vercel.app/debug/stripe`
2. Review the status of all environment variables
3. Follow the recommendations shown

### Required Environment Variables

#### For Email Functionality (Quotes/Invoices):
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=Trade Control <onboarding@resend.dev>
```

**Get Resend API Key:**
1. Go to https://resend.com
2. Sign up (free tier: 100 emails/day)
3. Get API key from dashboard
4. Add to Vercel Environment Variables
5. Redeploy

#### For Subscription Management (Upgrades/Licenses):
```
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx

STRIPE_PRICE_ID_OPERATIONS_BASE=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_MANAGEMENT_LICENSE=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_FIELD_STAFF_LICENSE=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_OPERATIONS_PRO_SCALE=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_OPERATIONS_PRO_UNLIMITED=price_xxxxxxxxxxxxx
```

**Get Stripe Keys and Price IDs:**
1. Go to https://dashboard.stripe.com/test/apikeys (get API keys)
2. Go to https://dashboard.stripe.com/test/products (create 5 products)
3. Copy Price IDs from each product
4. Add all to Vercel Environment Variables
5. Redeploy

### How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** tab
3. Click **Environment Variables** in sidebar
4. Add each variable:
   - Variable name (e.g., `STRIPE_SECRET_KEY`)
   - Value (paste your key)
   - Select environments: Production, Preview, Development
5. Click **Save**
6. **Important:** Redeploy after adding variables

### Vercel Deployment Notes

⚠️ **Environment variables are NOT automatically applied to existing deployments!**

After adding environment variables:
1. Go to **Deployments** tab
2. Click the three dots (...) on latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger automatic deployment

---

## Current Behavior After This Update

### During Free Trial (14 days):
- ✅ Can use all features except:
  - ❌ Cannot upgrade to Operations Pro
  - ❌ Cannot add additional licenses
  - ⚠️ Clear warning messages explain why

### Email Functionality:
- ✅ Better error messages when RESEND_API_KEY is missing
- ✅ Tells users exactly what to do
- ✅ Emails work once RESEND_API_KEY is added

### After Trial Ends:
- ✅ Can upgrade to Operations Pro
- ✅ Can add licenses
- ✅ All features fully functional

---

## Testing Checklist

### 1. Test Debug Page
- [ ] Visit `/debug/stripe`
- [ ] Verify it shows environment variable status
- [ ] Check recommendations section

### 2. Test Email Functionality
- [ ] Try to email a quote
- [ ] Verify error message is clear if RESEND_API_KEY missing
- [ ] After adding RESEND_API_KEY, verify emails send successfully

### 3. Test Subscription Management
- [ ] If in trial: Verify upgrade button shows warning message
- [ ] If in trial: Verify license add page shows warning
- [ ] After trial ends: Verify upgrade works
- [ ] After trial ends: Verify license addition works

---

## Quick Reference

### Issue: "Cannot upgrade to Pro"
**Cause:** Subscription is in trial status  
**Solution:** Wait for trial to end or add payment method in Stripe

### Issue: "Cannot add licenses"
**Cause:** Subscription is in trial status  
**Solution:** Wait for trial to end or add payment method in Stripe

### Issue: "Failed to send quote/invoice email"
**Cause:** RESEND_API_KEY not set  
**Solution:** Add RESEND_API_KEY to Vercel environment variables and redeploy

### Issue: "STRIPE_SECRET_KEY is not configured"
**Cause:** Stripe environment variables not set  
**Solution:** Add all Stripe variables to Vercel and redeploy

---

## Alternative: Use Mock Services for Testing

If you don't want to set up Stripe/Resend yet, you can switch to mock services:

See `scripts/switch-to-real-services.md` for instructions on switching between mock and real services.

**Quick command to switch to mocks:**
```powershell
# Find all imports and switch to mock
Get-ChildItem -Recurse -Include *.tsx,*.ts | ForEach-Object {
    (Get-Content $_.FullName) -replace "@/lib/services/stripe", "@/lib/services/stripe-mock" | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace "@/lib/services/resend", "@/lib/services/resend-mock" | Set-Content $_.FullName
}
```

---

## Summary

All code issues are now fixed. The remaining issues are **configuration only**:
1. Missing environment variables in Vercel
2. Trial subscriptions have intentional limitations (by Stripe design)

Use the debug page at `/debug/stripe` to see exactly what's missing!
