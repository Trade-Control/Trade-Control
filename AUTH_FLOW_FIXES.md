# Authentication Flow Fixes

## Issues Fixed

### 1. Email Verification Before Payment
**Problem:** Users were being sent to Stripe checkout immediately after signup, before verifying their email address. This meant unverified users could initiate payments.

**Solution:** 
- Modified signup flow to require email verification first
- Added `/auth/verify-email` page that displays after signup
- Created `/auth/callback` route handler to process email verification
- Created `/auth/checkout` page that initiates Stripe checkout only after verification
- Updated Supabase signup to include `emailRedirectTo` option

**New Flow:**
1. User fills out signup form
2. Account is created (but not fully activated)
3. User is redirected to `/auth/verify-email` page
4. User checks email and clicks verification link
5. Verification link redirects to `/auth/callback` which:
   - Exchanges code for session
   - Creates user profile
   - Redirects to `/auth/checkout`
6. Checkout page initiates Stripe payment flow
7. After payment, user completes onboarding

### 2. Missing Migration Page (404 Error)
**Problem:** Login page was redirecting to `/migration` which didn't exist, causing 404 errors after email confirmation.

**Solution:**
- Removed all references to `/migration` page
- Updated login logic to redirect to `/auth/checkout` instead
- Created `/subscription/expired` page for handling expired/past_due subscriptions

**Updated Login Flow:**
- No organization → `/auth/checkout` (instead of `/migration`)
- Has organization but no subscription → `/auth/checkout` (instead of `/migration`)
- Has organization but onboarding incomplete → `/onboarding`
- Subscription expired/past_due → `/subscription/expired`
- All good → `/dashboard`

## Files Modified

1. **src/app/(auth)/signup/page.tsx**
   - Added `emailRedirectTo` option to Supabase signup
   - Removed immediate Stripe checkout redirect
   - Added redirect to verification page
   - Store pending signup data in sessionStorage

2. **src/app/(auth)/login/page.tsx**
   - Replaced `/migration` redirects with `/auth/checkout`
   - Added `/subscription/expired` redirect for expired subscriptions

3. **src/app/auth/verify-email/page.tsx** (NEW)
   - Email verification waiting page
   - Shows user's email and next steps
   - Displays helpful instructions

4. **src/app/auth/callback/route.ts** (NEW)
   - Handles email verification callback
   - Exchanges code for session
   - Creates user profile
   - Redirects to appropriate page based on user status

5. **src/app/auth/checkout/page.tsx** (NEW)
   - Initiates Stripe checkout after verification
   - Checks for existing subscription
   - Creates checkout session and redirects to Stripe

6. **src/app/subscription/expired/page.tsx** (NEW)
   - Handles expired/cancelled subscription state
   - Provides options to reactivate or view dashboard

## Email Configuration Required

For email verification to work in production, you need to configure:

1. **Supabase Email Settings:**
   - Go to Supabase Dashboard → Authentication → Email Templates
   - Configure "Confirm signup" template
   - Set redirect URL to: `https://yourdomain.com/auth/callback`

2. **Environment Variables:**
   - Ensure `NEXT_PUBLIC_APP_URL` is set correctly in production

## Testing the Flow

### Local Testing
1. Start local dev server: `npm run dev`
2. Go to `/signup`
3. Fill out form and submit
4. Check email for verification link
5. Click verification link → should redirect to checkout
6. Complete Stripe checkout
7. Should redirect to onboarding

### Production Testing
1. Deploy to Vercel
2. Update Supabase email redirect URL
3. Test complete signup flow end-to-end

## User Experience Improvements

✅ **Before:** User creates account → immediately pays → must verify email → gets 404 error  
✅ **After:** User creates account → verifies email → then pays → smooth onboarding

This creates a more trustworthy experience and ensures:
- Only verified email addresses can subscribe
- No orphaned Stripe customers from unverified emails
- Clear communication at each step
- No 404 errors during signup flow
