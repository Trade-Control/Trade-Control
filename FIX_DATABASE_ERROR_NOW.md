# Fix "Database error checking email" - Quick Action Guide

## The Problem

You're getting "Database error checking email" when trying to sign up. This is because the old trigger is still in your database and conflicting with the new server-side approach.

## The Solution (5 Minutes)

### Step 1: Run Verification Query

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste this query:

```sql
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

4. Click **Run**

**If it returns a row**: The old trigger still exists (this is the problem!)  
**If it returns nothing**: The trigger is gone (good!)

### Step 2: Run Migration 014

1. In Supabase SQL Editor, click **New query**
2. Open the file: `supabase/migrations/014_remove_trigger_add_service_role_policy.sql`
3. Copy ALL the contents
4. Paste into Supabase SQL Editor
5. Click **Run**

You should see these messages:
```
NOTICE: Trigger removed successfully
NOTICE: Policy verification complete  
NOTICE: Service role policy created successfully
NOTICE: Migration 014 completed successfully
```

### Step 3: Verify It Worked

Run this verification query:

```sql
-- Check trigger is gone
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'SUCCESS - Trigger removed'
    ELSE 'FAILED - Trigger still exists'
  END as trigger_status
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check service role policy exists
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN 'SUCCESS - Service role policy exists'
    ELSE 'FAILED - Policy missing'
  END as policy_status
FROM pg_policies
WHERE tablename = 'profiles'
AND policyname = 'Service role can manage profiles';
```

Both should show "SUCCESS".

### Step 4: Restart Your Dev Server

```bash
# Stop the server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

### Step 5: Test Signup

1. Go to your signup page
2. Try signing up with a new email
3. It should work now!

## If It Still Doesn't Work

### Check 1: Service Role Key

Make sure this is in your `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
```

Get it from: Supabase Dashboard > Settings > API > service_role (secret)

### Check 2: Force Remove Trigger

If migration 014 didn't remove the trigger, force it:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Then add the service role policy
CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.profiles TO service_role;
```

### Check 3: Clear Existing Failed Users

If you tried signing up multiple times, you might have partial users:

```sql
-- Check for users without profiles
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC
LIMIT 5;
```

If you see users, delete them from Supabase Dashboard:
- Go to **Authentication** > **Users**
- Find and delete the test users
- Try signing up again

## What Changed

**Old (Broken) Approach**:
- Database trigger tried to create profile
- Trigger didn't fire reliably
- RLS policies blocked it
- Result: "Database error"

**New (Working) Approach**:
- Server-side API creates user
- Server uses service_role to create profile (bypasses RLS)
- 100% reliable
- Result: Signup works!

## Still Having Issues?

Run the full diagnostic:

1. Open `supabase/migrations/VERIFY_AUTH_SETUP.sql`
2. Copy all contents
3. Run in Supabase SQL Editor
4. Share the results

This will show exactly what's wrong.

## Quick Test

Test the API directly:

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test123@example.com","password":"test123","firstName":"Test","lastName":"User","phone":"+61400000000"}'
```

Expected response:
```json
{
  "success": true,
  "user": {"id": "...", "email": "test123@example.com"},
  "message": "Account created successfully...",
  "profileCreated": true
}
```

## Summary

1. ✅ Run migration 014 to remove old trigger
2. ✅ Verify trigger is gone and policy exists  
3. ✅ Restart dev server
4. ✅ Test signup

That's it! The "Database error checking email" should be fixed.
