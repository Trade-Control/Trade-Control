# Stripe Integration Issues and Fixes

## Issues Identified

### 1. **Email Sending (Quotes/Invoices) - RESEND_API_KEY Missing**
**Problem:** The email functionality is trying to use the real Resend service, but `RESEND_API_KEY` is not configured.

**Error:** When you try to email a quote or invoice, it fails because `getResendClient()` throws an error if `RESEND_API_KEY` is not set.

**Fix Options:**
- **Option A (Quick Fix):** Switch to mock email service for testing
- **Option B (Production Fix):** Set up Resend API key

### 2. **Subscription Upgrades/License Management - Missing Stripe Price IDs**
**Problem:** The subscription upgrade and license management features require Stripe Price IDs to be configured, but they're not set.

**What's Affected:**
- Upgrading from Operations to Operations Pro
- Adding management licenses
- Adding field staff licenses

**Why It Fails:** The `createSubscription()` and `addLicense()` functions check for `STRIPE_PRICE_ID_*` environment variables. If they're empty, no subscription items are created in Stripe.

### 3. **Free Trial Blocking Upgrades**
**Problem:** The code doesn't handle trial subscriptions properly when trying to upgrade.

**Current Flow:**
1. User signs up → 14-day trial created
2. User tries to upgrade → Stripe API call fails because:
   - Subscription is in "trialing" status
   - No payment method attached during trial
   - Stripe requires payment method before allowing subscription changes

---

## Complete Fix Guide

### Step 1: Set Up Stripe (Required for Production)

1. **Get Stripe API Keys:**
   ```bash
   # Go to https://dashboard.stripe.com/test/apikeys
   # Copy your keys
   ```

2. **Create Products in Stripe Dashboard:**
   - Go to https://dashboard.stripe.com/test/products
   - Create 5 products with these exact names:
     1. **Operations Base** - $49/month (recurring)
     2. **Management License** - $35/month (recurring)
     3. **Field Staff License** - $15/month (recurring)
     4. **Operations Pro - Scale** - $99/month (recurring)
     5. **Operations Pro - Unlimited** - $199/month (recurring)

3. **Copy Price IDs:**
   After creating each product, copy the Price ID (starts with `price_`)

4. **Update Environment Variables in Vercel:**
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

5. **Redeploy in Vercel** after adding environment variables

### Step 2: Set Up Resend (Required for Email Features)

1. **Get Resend API Key:**
   ```bash
   # Go to https://resend.com
   # Sign up (free tier: 100 emails/day)
   # Get API key from dashboard
   ```

2. **Update Environment Variables in Vercel:**
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   RESEND_FROM_EMAIL=Trade Control <onboarding@resend.dev>
   ```

3. **Redeploy in Vercel**

### Step 3: Fix Trial Subscription Upgrade Issue

The current code has a bug where trial subscriptions can't be upgraded because no payment method is attached. Here's the fix:

**File:** `app/(protected)/subscription/manage/page.tsx`

**Problem:** The `handleUpgradeToPro` function calls Stripe API without checking if there's a payment method.

**Solution:** Add payment method requirement before allowing upgrades during trial.

---

## Quick Fix for Testing (No Stripe Setup Required)

If you want to test the app without setting up Stripe/Resend:

### 1. Switch to Mock Services

**File:** `app/(protected)/jobs/[id]/quotes/page.tsx`
Change line 8:
```typescript
// FROM:
import { sendEmail, generateQuoteEmail } from '@/lib/services/resend';

// TO:
import { sendEmail, generateQuoteEmail } from '@/lib/services/resend-mock';
```

Do the same for all files that import from `@/lib/services/resend`.

### 2. Disable Subscription Upgrades During Trial

**File:** `app/(protected)/subscription/manage/page.tsx`

Add this check before the upgrade button:

```typescript
{subscription.tier === 'operations' && subscription.status !== 'trialing' && (
  <button
    onClick={handleUpgradeToPro}
    className="bg-purple-600 hover:bg-purple-700 rounded-lg shadow p-6 text-white transition-all"
  >
    {/* ... button content ... */}
  </button>
)}

{subscription.status === 'trialing' && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
    <div className="text-yellow-900 font-semibold mb-2">⚠️ Upgrade Available After Trial</div>
    <p className="text-sm text-yellow-700">
      You can upgrade to Operations Pro after your trial ends or by adding a payment method.
    </p>
  </div>
)}
```

### 3. Disable License Management During Trial

**File:** `app/(protected)/licenses/add/page.tsx`

Add a check at the top of the component to prevent adding licenses during trial.

---

## Testing the Debug Page

Visit `/debug/stripe` (no authentication required) to see:
- ✅ Which environment variables are set
- ✅ Whether Stripe API connection works
- ✅ Specific recommendations for fixing issues

---

## Root Cause Summary

1. **Email Failures:** `RESEND_API_KEY` not set → using real service but no API key
2. **Upgrade Failures:** `STRIPE_PRICE_ID_*` not set → Stripe can't create subscription items
3. **Trial Blocking:** No payment method during trial → Stripe rejects subscription modifications

## Recommended Actions

1. **Immediate:** Visit `/debug/stripe` to see exact status
2. **Short-term:** Switch to mock services for testing (see Quick Fix above)
3. **Production:** Set up Stripe and Resend properly (see Step 1 & 2 above)
4. **Code Fix:** Update subscription management to handle trial status properly

---

## Files That Need Attention

1. `app/(protected)/subscription/manage/page.tsx` - Add trial status checks
2. `app/(protected)/licenses/add/page.tsx` - Add trial status checks
3. `app/(protected)/jobs/[id]/quotes/page.tsx` - Switch to mock or add RESEND_API_KEY
4. `app/(protected)/jobs/[id]/invoices/page.tsx` - Switch to mock or add RESEND_API_KEY
5. `lib/services/stripe.ts` - Already has good error handling
6. `lib/services/resend.ts` - Already has good error handling

All services are correctly implemented - the issue is just missing environment variables in Vercel!
