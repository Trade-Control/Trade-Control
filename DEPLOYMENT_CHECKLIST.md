# Subscription Fix Deployment Checklist

## Pre-Deployment

### 1. Environment Setup ✓
- [ ] Set `ADMIN_REPAIR_KEY` environment variable with secure random value
- [ ] Verify all Stripe environment variables are set
- [ ] Verify Supabase environment variables are set
- [ ] Test environment variables in staging

### 2. Code Review ✓
- [ ] Review all changed files for correctness
- [ ] Run linter on all modified files (`npm run lint`)
- [ ] Run type checker (`npm run type-check`)
- [ ] Review test documentation

### 3. Database Backup ✓
- [ ] Create full database backup before migration
- [ ] Export current subscriptions table: `pg_dump -t subscriptions`
- [ ] Export current profiles table: `pg_dump -t profiles`
- [ ] Export current organizations table: `pg_dump -t organizations`
- [ ] Store backups in secure location

### 4. Staging Testing ✓
- [ ] Deploy to staging environment
- [ ] Run migration on staging database
- [ ] Test new user signup flow
- [ ] Test webhook handling
- [ ] Test repair script with dry-run
- [ ] Test access control redirects
- [ ] Verify no breaking changes

---

## Deployment Steps

### Step 1: Deploy Code (5 minutes)

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build application
npm run build

# Restart application
pm2 restart all
# or
systemctl restart your-app-service
```

### Step 2: Run Database Migration (2 minutes)

```bash
# Apply migration
npx supabase db push

# Verify migration success
psql -h your-db-host -U postgres -d your-db -c "
  SELECT conname FROM pg_constraint WHERE conname LIKE '%subscription%';
  SELECT viewname FROM pg_views WHERE viewname LIKE '%subscription%';
"
```

Expected output:
```
subscriptions_organization_id_unique
...
orphaned_subscriptions_view
profiles_without_subscription_view
```

### Step 3: Verify System Health (3 minutes)

```bash
# Check application is running
curl https://your-app.com/api/health

# Check database connectivity
psql -h your-db-host -U postgres -d your-db -c "SELECT 1;"

# Check Stripe webhook endpoint
curl -I https://your-app.com/api/webhooks/stripe
```

### Step 4: Run Repair Script - Dry Run (5 minutes)

```bash
# Check what would be fixed (dry run)
curl "https://your-app.com/api/admin/repair-subscriptions?adminKey=YOUR_KEY&dryRun=true" \
  -H "Cookie: your-auth-cookie" \
  > repair-dry-run-results.json

# Review results
cat repair-dry-run-results.json | jq '.summary'
```

Expected output:
```json
{
  "total": X,
  "linked": Y,
  "deletedEmptyOrgs": Z,
  "noAction": A,
  "errors": 0
}
```

### Step 5: Run Repair Script - Live (5 minutes)

**⚠️ IMPORTANT**: Only proceed if dry run results look correct

```bash
# Apply fixes
curl "https://your-app.com/api/admin/repair-subscriptions?adminKey=YOUR_KEY&dryRun=false" \
  -H "Cookie: your-auth-cookie" \
  > repair-live-results.json

# Review results
cat repair-live-results.json | jq '.summary'

# Save results for audit
cp repair-live-results.json backups/repair-$(date +%Y%m%d-%H%M%S).json
```

### Step 6: Verify Fixes (5 minutes)

```sql
-- Connect to database
psql -h your-db-host -U postgres -d your-db

-- Check for orphaned subscriptions (should be 0)
SELECT COUNT(*) FROM orphaned_subscriptions_view;

-- Check for profiles without subscriptions (owners should have them)
SELECT COUNT(*) FROM profiles_without_subscription_view WHERE role = 'owner';

-- Verify subscription count matches expected
SELECT 
  COUNT(*) as total_subscriptions,
  COUNT(DISTINCT organization_id) as orgs_with_subscriptions
FROM subscriptions;

-- Check recent audit trail
SELECT * FROM audit_trail 
WHERE resource_type = 'subscription' 
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
```

### Step 7: Test New User Flow (5 minutes)

1. Create test user account
2. Complete Stripe checkout with test card `4242 4242 4242 4242`
3. Verify redirect to onboarding
4. Complete onboarding
5. Navigate to subscription page
6. **Verify subscription shows as Active/Trialing**

### Step 8: Test Existing User Flow (5 minutes)

1. Log in as existing user with subscription
2. Navigate to subscription page
3. **Verify subscription shows correctly**
4. Navigate to dashboard
5. **Verify full access granted**

---

## Post-Deployment Monitoring

### Immediate (First 30 Minutes)

**Monitor these endpoints:**
- [ ] `/api/webhooks/stripe` - Check for errors
- [ ] `/api/stripe/sync-subscription` - Check retry rates
- [ ] `/api/admin/repair-subscriptions` - Verify repair worked

**Check logs for:**
- [ ] Webhook processing times
- [ ] Any error messages
- [ ] Idempotency check successes
- [ ] Subscription sync retries

**Run queries:**
```sql
-- Should be 0
SELECT COUNT(*) FROM orphaned_subscriptions_view;
SELECT COUNT(*) FROM profiles_without_subscription_view WHERE role = 'owner';

-- Should show recent activity
SELECT * FROM audit_trail 
WHERE resource_type = 'subscription' 
  AND created_at > NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC;
```

### First Hour

- [ ] Monitor error logs every 10 minutes
- [ ] Check for user support tickets
- [ ] Verify webhook success rate in Stripe dashboard
- [ ] Run monitoring queries every 15 minutes

### First 24 Hours

- [ ] Check monitoring views hourly
- [ ] Review webhook logs every 4 hours
- [ ] Monitor subscription sync endpoint performance
- [ ] Track new user signups success rate
- [ ] Review audit trail for anomalies

### First Week

**Daily Tasks:**
- [ ] Run morning health check queries
- [ ] Review previous day's audit trail
- [ ] Check for new orphaned subscriptions
- [ ] Monitor webhook performance metrics
- [ ] Check repair script dry-run output

---

## Rollback Procedure

### When to Rollback

Rollback immediately if:
- ❌ New users cannot complete signup
- ❌ Existing users lose access to paid features
- ❌ Database constraints causing application errors
- ❌ Webhook processing failures > 10%
- ❌ Critical bugs discovered

### Rollback Steps (15 minutes)

**Step 1: Revert Code**
```bash
# Identify commit to revert to
git log --oneline | head -10

# Revert to before deployment
git revert HEAD~6..HEAD  # Adjust number as needed

# Or hard reset (if no new data)
git reset --hard COMMIT_HASH

# Rebuild and restart
npm run build
pm2 restart all
```

**Step 2: Rollback Database**
```sql
-- Remove unique constraint
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_organization_id_unique;

-- Drop triggers
DROP TRIGGER IF EXISTS check_org_subscription_on_profile_update ON profiles;
DROP TRIGGER IF EXISTS prevent_duplicate_stripe_customers_trigger ON subscriptions;
DROP TRIGGER IF EXISTS log_subscription_changes_trigger ON subscriptions;

-- Drop functions
DROP FUNCTION IF EXISTS check_organization_has_subscription();
DROP FUNCTION IF EXISTS prevent_duplicate_stripe_customers();
DROP FUNCTION IF EXISTS log_subscription_changes();
DROP FUNCTION IF EXISTS find_organization_by_stripe_email(TEXT);

-- Drop views
DROP VIEW IF EXISTS orphaned_subscriptions_view;
DROP VIEW IF EXISTS profiles_without_subscription_view;

-- Drop indexes (optional - they don't hurt)
-- DROP INDEX IF EXISTS idx_subscriptions_stripe_customer_id;
-- DROP INDEX IF EXISTS idx_subscriptions_stripe_subscription_id;
```

**Step 3: Restore Emergency Access**

In `src/lib/auth/get-user.ts`, temporarily restore default access:
```typescript
// Emergency: Grant all users operations tier access
let tier: SubscriptionTier = 'operations'
let hasValidSubscription = true  // Grant access to everyone
```

**Step 4: Remove Middleware Checks**

Comment out subscription checks in `src/lib/supabase/middleware.ts`

**Step 5: Rebuild and Deploy**
```bash
npm run build
pm2 restart all
```

**Step 6: Verify Rollback**
- [ ] Test user can access dashboard
- [ ] Test new user signup works
- [ ] Verify no database errors
- [ ] Check application logs clear

**Step 7: Incident Report**

Document:
- What went wrong
- When it was discovered
- Impact (users affected, downtime)
- Root cause
- Rollback actions taken
- Next steps

---

## Success Criteria

### Deployment Successful If:
- ✅ All new users see subscriptions correctly
- ✅ All existing users maintain access
- ✅ Zero orphaned subscriptions in monitoring views
- ✅ Webhook success rate > 95%
- ✅ No increase in error rates
- ✅ No user complaints in first 24 hours
- ✅ Repair script completed successfully
- ✅ All tests pass

### Deployment Failed If:
- ❌ Users cannot sign up
- ❌ Paid users lose access
- ❌ Database errors occurring
- ❌ Webhook failure rate > 10%
- ❌ Multiple user complaints
- ❌ Critical bugs discovered

---

## Support Procedures

### User Reports Subscription Issue

**Immediate Response (< 5 minutes):**
1. Thank user and acknowledge issue
2. Get user email address
3. Run diagnostic query:
   ```sql
   SELECT 
     p.email,
     p.organization_id,
     o.name as org_name,
     s.status,
     s.stripe_customer_id
   FROM profiles p
   LEFT JOIN organizations o ON o.id = p.organization_id
   LEFT JOIN subscriptions s ON s.organization_id = p.organization_id
   WHERE p.email = 'user@example.com';
   ```

**Quick Fix (< 10 minutes):**
1. Check Stripe dashboard for customer
2. If subscription exists in Stripe but not in app:
   ```bash
   # Run repair for all users (or manually fix)
   curl "https://your-app.com/api/admin/repair-subscriptions?adminKey=KEY&dryRun=false"
   ```
3. Or manual database fix:
   ```sql
   -- Find correct org by Stripe customer
   SELECT organization_id FROM subscriptions 
   WHERE stripe_customer_id = 'cus_xxx';
   
   -- Update user profile
   UPDATE profiles 
   SET organization_id = 'correct-org-id'
   WHERE email = 'user@example.com';
   ```

**Follow Up (< 30 minutes):**
1. Verify fix worked
2. Notify user issue resolved
3. Add note to incident log
4. Check if other users affected

---

## Emergency Contacts

**Technical Lead**: [Name/Contact]
**Database Admin**: [Name/Contact]
**On-Call Engineer**: [Rotation/Pager]

**Key Resources**:
- Implementation Plan: `.cursor/plans/fix_subscription_linking_bug_3be27d87.plan.md`
- Testing Guide: `SUBSCRIPTION_FIX_TESTING.md`
- Implementation Summary: `SUBSCRIPTION_FIX_IMPLEMENTATION.md`
- This Checklist: `DEPLOYMENT_CHECKLIST.md`

---

## Sign-Off

**Deployment Date**: _______________
**Deployed By**: _______________
**Verified By**: _______________
**Rollback Plan Reviewed**: ☐ Yes ☐ No
**Backup Created**: ☐ Yes ☐ No
**Stakeholders Notified**: ☐ Yes ☐ No

**Deployment Status**:
- [ ] ✅ Successful - Monitoring ongoing
- [ ] ⚠️ Successful with warnings - Issues being addressed
- [ ] ❌ Failed - Rolled back
- [ ] 🔄 In progress

**Notes**:
_____________________________________________
_____________________________________________
_____________________________________________

---

**Last Updated**: January 21, 2026
**Version**: 1.0.0
