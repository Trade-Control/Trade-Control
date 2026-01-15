# Signup Flow Testing Guide

This document provides a comprehensive testing guide for the new email-verification-first signup flow.

## Overview of New Flow

The signup flow has been updated to require email verification BEFORE payment:

1. **Get Started** → User selects a tier
2. **Signup** → User creates account (with tier stored in metadata)
3. **Email Verification** → User verifies email
4. **Login** → User logs in with verified email
5. **Subscribe** → User enters business name and completes payment
6. **Success** → Organization and subscription created
7. **Onboarding** → User completes business setup
8. **Dashboard** → User accesses the application

## Test Scenarios

### Scenario 1: New User - Operations Tier

**Steps:**
1. Navigate to `/get-started`
2. Click "Choose Operations" button
3. Verify redirect to `/signup?tier=operations`
4. Fill in signup form:
   - First Name: Test
   - Last Name: User
   - Email: testuser@example.com
   - Password: password123
   - Confirm Password: password123
5. Click "Create Account"
6. Verify email verification notice appears
7. Click "Go to Login" button
8. Check email inbox for verification link
9. Click verification link in email
10. Return to app and log in with credentials
11. Verify redirect to `/subscribe?tier=operations`
12. Verify tier is pre-selected as "Operations"
13. Enter business name: "Test Business Pty Ltd"
14. Check "Accept terms" checkbox
15. Click "Start 14-Day Free Trial"
16. Complete Stripe checkout (test mode)
17. Verify redirect to `/subscription/success`
18. Check console logs for organization creation
19. Verify redirect to `/onboarding`
20. Complete onboarding steps
21. Verify redirect to `/dashboard`

**Expected Results:**
- ✅ User is created successfully
- ✅ Email verification notice shows
- ✅ Verification email is sent
- ✅ Login succeeds after verification
- ✅ Redirect to subscribe page with correct tier
- ✅ Stripe checkout completes
- ✅ Organization is created
- ✅ Profile has organization_id set
- ✅ Subscription is created with "trialing" status
- ✅ Owner license is created
- ✅ Onboarding page loads
- ✅ Dashboard is accessible

### Scenario 2: New User - Operations Pro Scale

**Steps:**
1. Navigate to `/get-started`
2. Click "Choose Operations Pro" button
3. Verify redirect to `/signup?tier=operations_pro`
4. Fill in signup form (different email)
5. Click "Create Account"
6. Verify email and log in
7. Verify redirect to `/subscribe?tier=operations_pro`
8. Verify "Operations Pro" is pre-selected
9. Select "Scale (50 contractors)" option
10. Enter business name
11. Complete checkout for $148/mo (Operations $49 + Pro Scale $99)
12. Verify organization creation
13. Complete onboarding
14. Access dashboard

**Expected Results:**
- ✅ Correct tier and pro level selected
- ✅ Correct pricing displayed
- ✅ Organization created with operations_pro tier
- ✅ Subscription has operations_pro_level = 'scale'

### Scenario 3: New User - Operations Pro Unlimited

**Steps:**
1. Follow same flow as Scenario 2
2. Select "Unlimited Contractors" option
3. Verify pricing is $248/mo (Operations $49 + Pro Unlimited $199)
4. Complete checkout and verify setup

**Expected Results:**
- ✅ operations_pro_level = 'unlimited'
- ✅ Correct total_price in subscription

### Scenario 4: Existing User Without Organization

**Steps:**
1. Manually create a user in Supabase (or use existing test user)
2. Ensure user has NO organization_id in profiles table
3. Try to access `/dashboard` directly
4. Verify redirect to `/subscribe`
5. Complete subscription flow
6. Verify organization is created and linked

**Expected Results:**
- ✅ Middleware redirects to /subscribe
- ✅ Can complete subscription
- ✅ Organization linked to existing user

### Scenario 5: User Tries to Access Subscribe Without Login

**Steps:**
1. Log out if logged in
2. Navigate to `/subscribe` directly
3. Verify redirect to `/signup`

**Expected Results:**
- ✅ Unauthenticated users cannot access /subscribe
- ✅ Redirected to /signup page

### Scenario 6: Logged-in User With Organization Tries Auth Pages

**Steps:**
1. Log in as a user with complete setup
2. Try to access `/login`
3. Verify redirect to `/dashboard`
4. Try to access `/signup`
5. Verify redirect to `/dashboard`
6. Try to access `/subscribe`
7. Verify redirect to `/dashboard` or `/onboarding`

**Expected Results:**
- ✅ Cannot access auth pages when already set up
- ✅ Proper redirects to dashboard or onboarding

### Scenario 7: Payment Success but Tab Closed

**Steps:**
1. Start signup flow
2. Complete Stripe checkout
3. Before success page loads fully, close the tab
4. Open new tab and log in
5. Verify system state

**Expected Results:**
- ✅ Organization should be created (via webhook)
- ✅ User redirected appropriately
- ✅ No duplicate organizations created

### Scenario 8: Payment Failure

**Steps:**
1. Start signup flow
2. Use Stripe test card that will decline (4000 0000 0000 0002)
3. Verify error handling

**Expected Results:**
- ✅ User returned to subscribe page
- ✅ Can retry with valid card
- ✅ No partial data created

## Database Verification

After completing a successful signup, verify in Supabase:

### Profiles Table
```sql
SELECT id, email, first_name, last_name, organization_id, role, license_id 
FROM profiles 
WHERE email = 'testuser@example.com';
```

**Expected:**
- organization_id: UUID (not null)
- role: 'owner'
- license_id: UUID (not null)

### Organizations Table
```sql
SELECT id, name, subscription_id, onboarding_completed
FROM organizations
WHERE id = '<organization_id from above>';
```

**Expected:**
- name: "Test Business Pty Ltd"
- subscription_id: UUID (not null)
- onboarding_completed: false (until onboarding complete)

### Subscriptions Table
```sql
SELECT id, organization_id, tier, operations_pro_level, status, stripe_customer_id, stripe_subscription_id
FROM subscriptions
WHERE organization_id = '<organization_id>';
```

**Expected:**
- tier: 'operations' or 'operations_pro'
- operations_pro_level: null, 'scale', or 'unlimited'
- status: 'trialing'
- stripe_customer_id: starts with 'cus_'
- stripe_subscription_id: starts with 'sub_'

### Licenses Table
```sql
SELECT id, organization_id, profile_id, license_type, status
FROM licenses
WHERE organization_id = '<organization_id>';
```

**Expected:**
- license_type: 'owner'
- status: 'active'
- profile_id: matches user's profile id

## Console Log Verification

During signup flow, check browser console for these logs:

### Subscribe Page
```
🔵 Starting subscription flow for authenticated user...
User ID: <uuid>
✅ Subscription details stored
Step 2: Creating Stripe Checkout Session...
✅ Checkout session created, redirecting to Stripe...
```

### Success Page
```
✅ User authenticated: <uuid>
🔍 Verifying Stripe checkout session...
✅ Stripe session verified
✅ Subscription data retrieved from session storage
📝 Creating organization and subscription...
✅ Organization and subscription created successfully
Organization ID: <uuid>
✅ Profile verified with organization_id: <uuid>
```

## Troubleshooting Common Issues

### Issue: User redirected back to /subscribe after payment

**Diagnosis:**
- Check if organization_id is set in profiles table
- Check if complete_signup function executed successfully
- Check browser console for errors on success page

**Solution:**
- Verify database function exists: `SELECT * FROM pg_proc WHERE proname = 'complete_signup'`
- Check RLS policies don't block the function
- Verify sessionStorage has pending_subscription data

### Issue: Email verification link doesn't work

**Diagnosis:**
- Check Supabase email settings
- Verify redirect URL is configured correctly
- Check spam folder

**Solution:**
- Configure email templates in Supabase dashboard
- Set correct site URL in project settings

### Issue: Stripe webhook not firing

**Diagnosis:**
- Check Stripe dashboard webhook logs
- Verify webhook secret is correct
- Check webhook endpoint is accessible

**Solution:**
- Test webhook endpoint: `POST /api/webhooks/stripe`
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Issue: Middleware redirect loop

**Diagnosis:**
- Check middleware logs
- Verify user authentication state
- Check organization_id in profile

**Solution:**
- Clear cookies and try again
- Check middleware logic for conflicting redirects
- Verify RLS policies allow reading profiles

## Test Cards (Stripe Test Mode)

- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **Insufficient Funds:** 4000 0000 0000 9995
- **Expired Card:** 4000 0000 0000 0069

Use any future expiry date and any 3-digit CVC.

## Success Criteria

All tests pass when:
- ✅ Users can sign up and select a tier
- ✅ Email verification is required
- ✅ Users can log in after verification
- ✅ Tier is pre-filled on subscribe page
- ✅ Stripe checkout completes successfully
- ✅ Organization is created and linked to profile
- ✅ Subscription is created with correct tier
- ✅ Owner license is created
- ✅ Onboarding page is accessible
- ✅ Dashboard is accessible after onboarding
- ✅ No redirect loops occur
- ✅ Middleware properly handles all states
- ✅ Database integrity is maintained
- ✅ Error handling works for edge cases

## Next Steps After Testing

1. Test with real email addresses (not just test accounts)
2. Test email deliverability
3. Test with actual Stripe live mode (small test transactions)
4. Monitor error logs in production
5. Set up Sentry or similar for error tracking
6. Create user documentation for signup flow
7. Test on multiple browsers and devices
8. Test with different email providers (Gmail, Outlook, etc.)
9. Verify mobile responsive design
10. Load test the signup flow
