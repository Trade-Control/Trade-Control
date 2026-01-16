# Troubleshooting "Database error checking email"

## What This Error Means

The error "Database error checking email" occurs when Supabase Auth tries to create a user but encounters a database issue. This is typically related to:

1. Missing database trigger/function (even though we removed it)
2. Missing RLS policies for service_role
3. Database connection issues
4. Supabase service temporary issues

## Quick Fix Steps

### Step 1: Run Migration 014

**IMPORTANT**: You must run this migration to remove the old trigger and add the service_role policy.

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New query**
4. Copy and paste the contents of `supabase/migrations/014_remove_trigger_add_service_role_policy.sql`
5. Click **Run**

Expected output:
```
NOTICE: Trigger removed successfully
NOTICE: Policy verification complete
NOTICE: Service role policy created successfully
NOTICE: Migration 014 completed successfully
```

### Step 2: Verify Service Role Policy Exists

Run this query in Supabase SQL Editor:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
AND policyname = 'Service role can manage profiles';
```

Expected: Should return 1 row showing the policy exists.

### Step 3: Verify Old Trigger is Removed

Run this query:

```sql
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

Expected: Should return 0 rows (trigger should be gone).

### Step 4: Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to **Logs** → **Postgres Logs**
3. Look for errors related to:
   - `handle_new_user` function
   - `on_auth_user_created` trigger
   - Profile creation errors
   - RLS policy violations

### Step 5: Test Signup Again

1. Try signing up with a new email
2. Check the browser console for detailed error logs
3. Check the Network tab for the API response

## Common Causes and Solutions

### Cause 1: Old Trigger Still Exists

**Symptoms**: 
- "Database error checking email"
- Logs show trigger errors

**Solution**:
```sql
-- Force remove the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
```

### Cause 2: Missing Service Role Policy

**Symptoms**:
- Profile creation fails
- RLS policy violation errors

**Solution**:
```sql
-- Add service role policy
CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.profiles TO service_role;
```

### Cause 3: Email Already Exists

**Symptoms**:
- Error mentions "already registered"
- User exists in auth.users but no profile

**Solution**:
1. Check if user exists:
```sql
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email = 'test@example.com';
```

2. If user exists without profile, create profile:
```sql
INSERT INTO profiles (id, first_name, last_name, created_at, updated_at)
SELECT id, 'Unknown', 'User', NOW(), NOW()
FROM auth.users
WHERE email = 'test@example.com'
AND id NOT IN (SELECT id FROM profiles);
```

3. Or delete the user and try again:
```sql
-- Use Supabase Dashboard > Authentication > Users > Delete User
```

### Cause 4: Supabase Service Issues

**Symptoms**:
- Intermittent errors
- Works sometimes, fails other times

**Solution**:
1. Check Supabase status: https://status.supabase.com/
2. Wait a few minutes and try again
3. Check your Supabase project isn't paused

## Debug Mode

To get more detailed error information, check:

1. **Browser Console**: Look for detailed error logs from the signup form
2. **Network Tab**: Check the `/api/auth/signup` response
3. **Server Logs**: If running locally, check terminal output
4. **Supabase Logs**: Check Postgres and Auth logs in dashboard

## Manual Test

Test the API directly with curl:

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+61400000000"
  }'
```

Expected response:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "test@example.com"
  },
  "message": "Account created successfully...",
  "profileCreated": true
}
```

## Still Not Working?

If you've tried all the above and it still doesn't work:

1. **Check Environment Variables**:
```bash
# Verify these are set in .env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

2. **Restart Development Server**:
```bash
# Stop the server (Ctrl+C)
npm run dev
```

3. **Check Database Schema**:
```sql
-- Verify profiles table exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

4. **Try Creating User Manually**:
```sql
-- Test if service_role can insert
-- Run this in Supabase SQL Editor (uses service_role automatically)
INSERT INTO profiles (id, first_name, last_name, created_at, updated_at)
VALUES (gen_random_uuid(), 'Test', 'User', NOW(), NOW())
RETURNING *;
```

If this works, the issue is with the Auth API, not the database.

## Contact Support

If none of these solutions work, gather this information:

1. Exact error message from browser console
2. Response from `/api/auth/signup` endpoint
3. Supabase Postgres logs
4. Result of running the verification queries above
5. Whether migration 014 was run successfully

This will help diagnose the specific issue.
