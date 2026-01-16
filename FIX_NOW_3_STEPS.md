# Fix "Database connection error" - 3 STEPS ONLY

## What's Happening

The old database trigger is causing Supabase Auth to fail when creating users. We need to remove it.

## Fix It Now (3 Steps - 2 Minutes)

### STEP 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New query**

### STEP 2: Run This Cleanup Script

Copy and paste this entire script into the SQL Editor:

```sql
-- Force remove the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create service_role policy
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;
CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.profiles TO service_role;

-- Verify it worked
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ SUCCESS - Trigger removed'
    ELSE '✗ FAILED - Trigger still exists'
  END as status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

Click **Run** (or press Ctrl+Enter)

**Expected output**: `✓ SUCCESS - Trigger removed`

### STEP 3: Restart Dev Server

In your terminal:

```bash
# Press Ctrl+C to stop the server
# Then restart:
npm run dev
```

## Test It

1. Go to your signup page
2. Try signing up with a **NEW** email (not one you've tried before)
3. It should work now!

---

## If It Still Doesn't Work

### Option A: Check for Failed Users

You might have partial users from failed signups. Delete them:

1. Go to Supabase Dashboard
2. Click **Authentication** → **Users**
3. Find any test users you created
4. Click the **...** menu → **Delete User**
5. Try signing up again with that email

### Option B: Run the Full Cleanup

If the simple script didn't work, run the aggressive cleanup:

1. Open `supabase/migrations/FORCE_CLEANUP_NOW.sql`
2. Copy ALL contents
3. Paste into Supabase SQL Editor
4. Click **Run**

You should see:
```
✓ All triggers removed from auth.users
✓ All related functions removed
✓ Service role policy exists
✓✓✓ CLEANUP COMPLETE ✓✓✓
```

### Option C: Check Service Role Key

Make sure this is in your `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-actual-key
```

Get it from: Supabase Dashboard → Settings → API → service_role (secret)

Then restart your dev server.

---

## Why This Fixes It

**The Problem**: 
- Old trigger tries to create profile when user signs up
- Trigger fails due to RLS policies
- Supabase Auth sees the failure and returns "Database connection error"

**The Solution**:
- Remove the trigger completely
- Let the server-side API create profiles using service_role
- service_role bypasses RLS, so it always works

---

## Quick Test Command

After fixing, test the API directly:

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","firstName":"Test","lastName":"User"}'
```

Expected response:
```json
{
  "success": true,
  "user": {"id": "...", "email": "test@example.com"},
  "profileCreated": true
}
```

---

## Still Stuck?

Run this diagnostic query in Supabase SQL Editor:

```sql
-- Check what's blocking signup
SELECT 'Triggers on auth.users:' as check_type, COUNT(*) as count
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users'
UNION ALL
SELECT 'Service role policy:', COUNT(*)
FROM pg_policies
WHERE tablename = 'profiles' AND policyname = 'Service role can manage profiles';
```

Expected output:
```
Triggers on auth.users: 0
Service role policy: 1
```

If you see different numbers, the cleanup didn't work. Share the output and I'll help debug.
