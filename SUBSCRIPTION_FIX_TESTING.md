# Subscription Linking Bug - Testing Guide

## Overview

This document provides comprehensive testing procedures to verify the subscription linking bug has been fixed and all edge cases are handled correctly.

## What Was Fixed

### Root Cause
The application had a race condition between:
1. **Stripe Webhook**: Creates organization + subscription when payment completes
2. **Fallback Organization Creation**: Creates empty organization if webhook hasn't fired yet

This resulted in users being linked to empty organizations while their paid subscriptions existed in orphaned organizations.

### Solution Implemented
1. **Phase 1**: Modified `ensureOrganization()` to check Stripe for existing customers before creating fallback orgs
2. **Phase 2**: Created repair script to fix existing affected users
3. **Phase 3**: Added subscription validation in middleware and user auth
4. **Phase 4**: Improved webhook idempotency and retry logic
5. **Phase 5**: Added database constraints and monitoring views

## Pre-Testing Setup

### 1. Environment Configuration

Ensure these environment variables are set:
```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_OPERATIONS_PRICE_ID=price_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Admin repair endpoint (set a secure random key)
ADMIN_REPAIR_KEY=your-secure-random-key-here
```

### 2. Database Migration

Run the new migration to add constraints:
```bash
# Apply migration
npx supabase db push

# Or if using Supabase CLI
supabase db push
```

### 3. Verify Migration Success

Check that new constraints and views exist:
```sql
-- Check constraints
SELECT conname FROM pg_constraint 
WHERE conname LIKE '%subscription%';

-- Check views
SELECT viewname FROM pg_views 
WHERE viewname LIKE '%subscription%';

-- Check triggers
SELECT tgname FROM pg_trigger 
WHERE tgname LIKE '%subscription%';
```

## Test Cases

### Test 1: New User Signup Flow (Happy Path)

**Objective**: Verify new users get properly linked to their subscription

**Steps**:
1. Create new user account via signup
2. Complete Stripe checkout with test card `4242 4242 4242 4242`
3. Wait for redirect to onboarding page
4. Complete onboarding form
5. Navigate to subscription management page

**Expected Results**:
- ✅ User is redirected to onboarding after payment
- ✅ Organization is created by webhook
- ✅ Subscription record exists in database
- ✅ User profile is linked to correct organization
- ✅ Subscription page shows "Active Subscription" or "Trialing"
- ✅ User has full access to dashboard features

**Verification Queries**:
```sql
-- Check user's organization and subscription
SELECT 
  p.email,
  p.organization_id,
  o.name,
  s.status,
  s.tier,
  s.stripe_customer_id
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN subscriptions s ON s.organization_id = p.organization_id
WHERE p.email = 'test-user@example.com';

-- Should return one row with all fields populated
```

**Logs to Check**:
```
✓ Organization created: [uuid]
✓ Subscription created
✓ Profile linked to organization
✓ Owner license created
✓ Webhook completed successfully in [time]ms
```

---

### Test 2: Race Condition Simulation

**Objective**: Verify the fix handles webhook delays correctly

**Steps**:
1. **Block webhook endpoint** temporarily (e.g., firewall rule, nginx config)
2. Create new user and complete Stripe checkout
3. User gets redirected to onboarding (webhook hasn't fired yet)
4. Onboarding page calls `ensureOrganization()`
5. **Unblock webhook endpoint**
6. Webhook fires and processes payment
7. Refresh subscription page

**Expected Results**:
- ✅ `ensureOrganization()` checks Stripe for existing customer
- ✅ Finds Stripe customer with subscription
- ✅ Links user to webhook-created organization (not new empty one)
- ✅ No orphaned organizations created
- ✅ Subscription appears on subscription page

**Verification Queries**:
```sql
-- Check for orphaned organizations (should be empty)
SELECT * FROM orphaned_subscriptions_view;

-- Check for profiles without subscriptions (should be empty for owners)
SELECT * FROM profiles_without_subscription_view;

-- Count organizations (should be minimal, no extras)
SELECT COUNT(*) FROM organizations;
```

**Logs to Check**:
```
Found Stripe customer: cus_...
Found subscription in org: [uuid]
[DRY RUN] Would link profile to organization [uuid]
Successfully linked user to organization with subscription
```

---

### Test 3: Webhook Idempotency

**Objective**: Verify webhooks can be replayed safely without creating duplicates

**Steps**:
1. Create new user and complete checkout
2. Using Stripe Dashboard, **resend the same webhook** 2-3 times
3. Check database for duplicate organizations/subscriptions

**Expected Results**:
- ✅ Only ONE organization created
- ✅ Only ONE subscription record created
- ✅ Subsequent webhook calls return early (idempotent)
- ✅ No errors in logs

**Verification Queries**:
```sql
-- Check for duplicate subscriptions by Stripe subscription ID
SELECT stripe_subscription_id, COUNT(*) as count
FROM subscriptions
GROUP BY stripe_subscription_id
HAVING COUNT(*) > 1;
-- Should return no rows

-- Check for duplicate organizations for same user
SELECT p.email, COUNT(DISTINCT p.organization_id) as org_count
FROM profiles p
GROUP BY p.email
HAVING COUNT(DISTINCT p.organization_id) > 1;
-- Should return no rows
```

**Logs to Check**:
```
✓ Subscription already exists (idempotent check), skipping creation
Existing organization ID: [uuid]
✓ Webhook completed (idempotent) in [time]ms
```

---

### Test 4: Repair Script for Existing Users

**Objective**: Fix users who were affected by the bug before the fix

**Prerequisites**: Create a test user with orphaned subscription:
```sql
-- Create test orphaned situation
INSERT INTO organizations (id, name) VALUES 
  ('org-with-sub', 'Org With Subscription'),
  ('org-empty', 'Empty Organization');

INSERT INTO subscriptions (organization_id, stripe_customer_id, stripe_subscription_id, tier, status, current_period_start, current_period_end)
VALUES ('org-with-sub', 'cus_test123', 'sub_test123', 'operations', 'active', NOW(), NOW() + INTERVAL '1 month');

INSERT INTO profiles (id, email, first_name, last_name, organization_id, role)
VALUES (auth.uid(), 'orphaned@example.com', 'Test', 'User', 'org-empty', 'owner');
-- User is linked to empty org, but subscription is in different org
```

**Steps**:
1. Run repair script in dry-run mode:
   ```
   GET /api/admin/repair-subscriptions?adminKey=YOUR_KEY&dryRun=true
   ```
2. Review the output for affected users
3. Run repair script for real:
   ```
   GET /api/admin/repair-subscriptions?adminKey=YOUR_KEY&dryRun=false
   ```
4. Verify user can now see subscription

**Expected Results**:
- ✅ Script identifies orphaned users
- ✅ Links users to correct organization with subscription
- ✅ Deletes empty orphaned organizations
- ✅ User can access subscription page successfully

**Response Example**:
```json
{
  "success": true,
  "dryRun": false,
  "summary": {
    "total": 5,
    "linked": 2,
    "deletedEmptyOrgs": 2,
    "noAction": 3,
    "errors": 0
  },
  "results": [...]
}
```

---

### Test 5: Access Control Enforcement

**Objective**: Verify users without valid subscriptions are restricted

**Steps**:
1. Create user without completing payment
2. Try to access dashboard routes directly
3. Update subscription status to 'cancelled' in database
4. Try to access dashboard
5. Update subscription status to 'past_due'
6. Try to access dashboard

**Expected Results**:
- ✅ User without subscription redirected to `/auth/checkout`
- ✅ User with cancelled subscription redirected to `/subscription/expired`
- ✅ User with past_due subscription redirected to `/subscription/manage`
- ✅ Subscription page correctly shows subscription status
- ✅ Access controls prevent unauthorized feature access

**Test URLs**:
- `/dashboard`
- `/jobs`
- `/quotes`
- `/invoices`
- `/contacts`
- `/contractors`

**Verification**:
Check middleware logs:
```
No subscription found for user, redirecting to checkout
Subscription cancelled, redirecting to expired page
Subscription past due, redirecting to manage page
```

---

### Test 6: Subscription Sync with Retry Logic

**Objective**: Verify sync endpoint handles delays gracefully

**Steps**:
1. Complete Stripe checkout
2. **Immediately** navigate to onboarding (before webhook fires)
3. Onboarding calls `/api/stripe/sync-subscription`
4. Observe retry behavior in logs

**Expected Results**:
- ✅ Sync endpoint checks for existing subscription
- ✅ If not found, manually processes checkout session
- ✅ Retries verification with exponential backoff
- ✅ Successfully verifies after retries
- ✅ User proceeds to dashboard smoothly

**Logs to Check**:
```
=== SYNC SUBSCRIPTION REQUEST ===
Session ID: cs_test_...
Processing checkout session manually (webhook might not have fired yet)...
Verification attempt 1/3...
Waiting 1000ms before retry...
Verification attempt 2/3...
✓ Subscription verified successfully
```

---

### Test 7: Database Constraints

**Objective**: Verify database prevents invalid states

**Tests**:

**A. Unique Subscription per Organization**
```sql
-- Try to create duplicate subscription (should fail)
INSERT INTO subscriptions (organization_id, stripe_customer_id, stripe_subscription_id, tier, status, current_period_start, current_period_end)
VALUES (
  (SELECT id FROM organizations LIMIT 1),
  'cus_duplicate',
  'sub_duplicate',
  'operations',
  'active',
  NOW(),
  NOW() + INTERVAL '1 month'
);
-- Should raise: ERROR: duplicate key value violates unique constraint
```

**B. Duplicate Stripe Customer Prevention**
```sql
-- Try to link same Stripe customer to different org (should fail)
INSERT INTO subscriptions (organization_id, stripe_customer_id, stripe_subscription_id, tier, status, current_period_start, current_period_end)
VALUES (
  (SELECT id FROM organizations WHERE id != (SELECT organization_id FROM subscriptions WHERE stripe_customer_id = 'cus_test' LIMIT 1) LIMIT 1),
  'cus_test', -- Same customer ID
  'sub_different',
  'operations',
  'active',
  NOW(),
  NOW() + INTERVAL '1 month'
);
-- Should raise: ERROR: Stripe customer already linked to organization
```

**C. Audit Trail Logging**
```sql
-- Check audit trail after subscription change
SELECT * FROM audit_trail
WHERE resource_type = 'subscription'
ORDER BY created_at DESC
LIMIT 10;
-- Should show subscription_created and subscription_updated events
```

---

### Test 8: Monitoring Views

**Objective**: Verify monitoring views help detect issues

**Queries**:

```sql
-- Check for orphaned subscriptions (should be empty in healthy system)
SELECT * FROM orphaned_subscriptions_view;

-- Check for profiles without subscriptions (owners should have them)
SELECT * FROM profiles_without_subscription_view
WHERE role = 'owner';

-- Both should return no rows if system is healthy
```

---

## Performance Testing

### Webhook Processing Time

Monitor webhook processing time to ensure it stays under 5 seconds:

```sql
-- Check audit trail for webhook timing
SELECT 
  details->>'stripe_subscription_id' as subscription_id,
  created_at,
  details
FROM audit_trail
WHERE action = 'subscription_created'
ORDER BY created_at DESC
LIMIT 10;
```

### Sync Endpoint Performance

Test sync endpoint under load:
- Multiple concurrent requests with same session_id (idempotency)
- Requests with delayed webhooks (retry logic)

Expected: < 10 seconds total (including retries)

---

## Rollback Procedures

If issues are discovered during testing:

### 1. Revert Code Changes

```bash
git revert [commit-hash]
```

### 2. Rollback Database Migration

```sql
-- Drop new constraints
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_organization_id_unique;

-- Drop new triggers
DROP TRIGGER IF EXISTS check_org_subscription_on_profile_update ON profiles;
DROP TRIGGER IF EXISTS prevent_duplicate_stripe_customers_trigger ON subscriptions;
DROP TRIGGER IF EXISTS log_subscription_changes_trigger ON subscriptions;

-- Drop new functions
DROP FUNCTION IF EXISTS check_organization_has_subscription();
DROP FUNCTION IF EXISTS prevent_duplicate_stripe_customers();
DROP FUNCTION IF EXISTS log_subscription_changes();
DROP FUNCTION IF EXISTS find_organization_by_stripe_email(TEXT);

-- Drop views
DROP VIEW IF EXISTS orphaned_subscriptions_view;
DROP VIEW IF EXISTS profiles_without_subscription_view;
```

### 3. Restore get-user.ts Default Behavior

Revert to always defaulting to 'operations' tier if needed for emergency access.

---

## Success Criteria

All tests must pass with:
- ✅ No orphaned organizations created
- ✅ No orphaned subscriptions
- ✅ All paid users see active subscriptions
- ✅ Webhook idempotency works correctly
- ✅ Access controls enforce subscription requirements
- ✅ Database constraints prevent invalid states
- ✅ Monitoring views show healthy system
- ✅ Performance under acceptable limits

---

## Post-Deployment Monitoring

### Week 1: Intensive Monitoring

Check daily:
```sql
-- Orphaned subscriptions
SELECT COUNT(*) FROM orphaned_subscriptions_view;

-- Profiles without subscriptions
SELECT COUNT(*) FROM profiles_without_subscription_view WHERE role = 'owner';

-- Recent subscription changes
SELECT * FROM audit_trail 
WHERE resource_type = 'subscription' 
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Ongoing: Weekly Checks

- Run repair script in dry-run mode weekly
- Review Stripe webhook logs for failures
- Monitor subscription sync retry rates
- Check for performance degradation

---

## Support Procedures

If users report subscription issues:

1. **Verify in Database**:
   ```sql
   SELECT 
     p.email,
     p.organization_id,
     o.name as org_name,
     s.status,
     s.stripe_customer_id,
     s.stripe_subscription_id
   FROM profiles p
   LEFT JOIN organizations o ON o.id = p.organization_id
   LEFT JOIN subscriptions s ON s.organization_id = p.organization_id
   WHERE p.email = '[user-email]';
   ```

2. **Check Stripe Dashboard**: Verify customer and subscription status in Stripe

3. **Run Repair Script**: Use admin endpoint to fix specific user
   ```
   GET /api/admin/repair-subscriptions?adminKey=KEY&dryRun=false
   ```

4. **Manual Fix** (if needed):
   ```sql
   -- Find correct organization by Stripe customer ID
   SELECT organization_id FROM subscriptions 
   WHERE stripe_customer_id = 'cus_xxx';
   
   -- Update user profile
   UPDATE profiles 
   SET organization_id = '[correct-org-id]'
   WHERE email = '[user-email]';
   ```

---

## Contact

For questions or issues during testing, refer to:
- `SUBSCRIPTION_FIX_TESTING.md` (this file)
- `c:\Users\vinee\.cursor\plans\fix_subscription_linking_bug_3be27d87.plan.md`
- Implementation in `src/actions/organizations.ts`
