# Debug Signup Issue - Testing and Verification Guide

## Overview

This guide walks you through debugging and fixing the "Database error finding user" issue during signup. Follow these steps in order.

## Step 1: Run Diagnostic Queries

### Location
`supabase/migrations/012_diagnose_signup_issue.sql`

### Instructions
1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New query**
4. Copy and paste the contents of `012_diagnose_signup_issue.sql`
5. Click **Run**

### What to Look For

#### Trigger Check (Query 1)
- **Expected**: Should return 1 row with `trigger_name = 'on_auth_user_created'`
- **If Missing**: Trigger doesn't exist - run migration `011_fix_profile_creation_trigger.sql`

#### Function Check (Query 2)
- **Expected**: Should return 1 row with `security_type = 'DEFINER'`
- **If Missing**: Function doesn't exist - run migration `011_fix_profile_creation_trigger.sql`

#### RLS Policies (Query 4)
- **Expected**: Should see policies including:
  - "Users can insert their own profile"
  - "Service role can insert profiles" (after running migration 013)
- **If Missing Service Role Policy**: Run migration `013_fix_rls_for_trigger.sql`

#### RLS Enabled (Query 5)
- **Expected**: `rowsecurity = true`
- **If False**: RLS is disabled (unlikely, but check)

#### Function Permissions (Query 6)
- **Expected**: `security_definer = true`, `owner = 'postgres'` or `'service_role'`
- **If Wrong**: Function needs to be recreated with SECURITY DEFINER

### Document Your Findings

Create a note with:
- ✅ Trigger exists: Yes/No
- ✅ Function exists: Yes/No
- ✅ Function is SECURITY DEFINER: Yes/No
- ✅ RLS enabled: Yes/No
- ✅ Service role policy exists: Yes/No
- ✅ Any errors or warnings

## Step 2: Run Database Fixes

### Fix 1: Enhanced Trigger Migration
**File**: `supabase/migrations/011_fix_profile_creation_trigger.sql`

1. Run this migration in Supabase SQL Editor
2. Check for success message: "Profile creation trigger installed successfully"
3. Verify trigger status shows "O" (enabled)

### Fix 2: RLS Policy Fix
**File**: `supabase/migrations/013_fix_rls_for_trigger.sql`

1. Run this migration in Supabase SQL Editor
2. Verify policy was created (run Query 4 from diagnostics again)
3. Should see "Service role can insert profiles" policy

## Step 3: Test Signup Flow

### Option A: Use Diagnostic Endpoint (Recommended)

1. Start your development server: `npm run dev`
2. Use curl or Postman to test:

```bash
curl -X POST http://localhost:3000/api/debug/signup-test \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

3. Review the response:
   - Check `success` field
   - Review `steps` array for each step's status
   - Check `errors` array for any failures
   - Review `summary` for overall status

### Option B: Test via UI

1. Go to your signup page
2. Fill in the form with a test email
3. Submit the form
4. Check browser console for detailed logs:
   - ✅ User created
   - ✅ Profile exists/created
   - ✅ Profile updated
   - ❌ Any errors

### Option C: Manual Database Check

After attempting signup, run these queries:

```sql
-- Check if user was created
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email = 'test@example.com'
ORDER BY created_at DESC
LIMIT 1;

-- Check if profile exists for that user
SELECT p.*, u.email
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'test@example.com';
```

## Step 4: Verify Fixes Work

### Checklist

- [ ] Diagnostic queries run without errors
- [ ] Trigger exists and is enabled
- [ ] Function exists with SECURITY DEFINER
- [ ] Service role policy exists
- [ ] Signup test endpoint returns success
- [ ] Profile is created automatically
- [ ] Profile can be updated
- [ ] No errors in browser console
- [ ] No errors in Supabase logs

### Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to **Logs** → **Postgres Logs**
3. Look for:
   - Warnings from `handle_new_user` function
   - Errors related to profile creation
   - Any RLS policy violations

4. Look for these messages:
   - ✅ "Successfully created profile for user..."
   - ⚠️ "Failed to create profile for user..." (if trigger fails)
   - ⚠️ "Profile already exists for user..." (if duplicate)

## Step 5: Troubleshooting

### Issue: Trigger Still Not Working

**Symptoms**: Profile not created after signup

**Solutions**:
1. Verify trigger is enabled: Run Query 11 from diagnostics
2. Check function permissions: Run Query 6 from diagnostics
3. Check RLS policies: Run Query 4 from diagnostics
4. Review Postgres logs for specific errors

### Issue: RLS Policy Blocking

**Symptoms**: Error mentions "row-level security" or "policy"

**Solutions**:
1. Run migration `013_fix_rls_for_trigger.sql`
2. Verify service_role policy exists
3. Check if function owner has correct permissions

### Issue: Function Not SECURITY DEFINER

**Symptoms**: Function exists but trigger fails

**Solutions**:
1. Re-run migration `011_fix_profile_creation_trigger.sql`
2. Verify `prosecdef = true` in function check query
3. Ensure function owner is postgres or service_role

### Issue: Profile Created But Update Fails

**Symptoms**: Profile exists but can't update user details

**Solutions**:
1. Check RLS update policy exists (should be in Query 4)
2. Verify user is authenticated
3. Check browser console for specific error

## Step 6: Production Deployment

### Pre-Deployment Checklist

- [ ] All migrations tested in development
- [ ] Diagnostic queries run successfully
- [ ] Signup flow tested end-to-end
- [ ] No errors in logs
- [ ] Fallback profile creation works

### Deployment Steps

1. **Backup Database** (if possible)
   - Export current schema
   - Note any custom changes

2. **Run Migrations in Order**:
   - `011_fix_profile_creation_trigger.sql`
   - `013_fix_rls_for_trigger.sql`

3. **Verify Migrations**:
   - Run diagnostic queries (012)
   - Check for success messages
   - Verify no errors

4. **Test Signup**:
   - Use diagnostic endpoint
   - Test via UI
   - Verify profile creation

5. **Monitor**:
   - Watch Supabase logs
   - Check for warnings/errors
   - Monitor signup success rate

## Expected Behavior After Fixes

### Successful Signup Flow

1. User submits signup form
2. `supabase.auth.signUp()` creates user in `auth.users`
3. Trigger `on_auth_user_created` fires automatically
4. Function `handle_new_user()` creates profile in `profiles` table
5. Signup code checks if profile exists
6. If profile exists: Updates with user details
7. If profile missing: Creates fallback profile
8. User sees email verification notice
9. User can log in after email verification

### Console Logs (Success)

```
✅ User created: <user-id>
✅ Profile exists, updating with user details
✅ Profile updated successfully
```

### Console Logs (Fallback)

```
✅ User created: <user-id>
⚠️ Profile not found, creating fallback profile
✅ Fallback profile created
```

### Console Logs (Error)

```
❌ Signup error: <error message>
Error details: { message, code, status, ... }
```

## Additional Resources

- **Diagnostic Queries**: `supabase/migrations/012_diagnose_signup_issue.sql`
- **Trigger Fix**: `supabase/migrations/011_fix_profile_creation_trigger.sql`
- **RLS Fix**: `supabase/migrations/013_fix_rls_for_trigger.sql`
- **Diagnostic Endpoint**: `app/api/debug/signup-test/route.ts`
- **Signup Code**: `app/(auth)/signup/page.tsx`

## Support

If issues persist after following this guide:

1. Collect diagnostic information:
   - Results from all diagnostic queries
   - Response from signup-test endpoint
   - Browser console logs
   - Supabase Postgres logs

2. Check for:
   - Custom RLS policies that might conflict
   - Database schema changes
   - Supabase configuration changes
   - Network/firewall issues

3. Review:
   - Supabase documentation on triggers
   - RLS policy documentation
   - Function security documentation
