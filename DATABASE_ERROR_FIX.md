# Fix: Database Error Finding User During Signup

## Problem

When users try to sign up, they get the error:
```
Database error finding user
Failed to load resource: the server responded with a status of 500
```

## Root Cause

This error occurs when the automatic profile creation trigger is missing or not working properly in your Supabase database. When a new user signs up through Supabase Auth, a trigger should automatically create a corresponding row in the `profiles` table, but if this trigger is missing or fails, the signup process fails.

## Solution

### Option 1: Run the Migration (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New query**
4. Copy and paste the contents of `supabase/migrations/011_fix_profile_creation_trigger.sql`
5. Click **Run**

You should see the message: "Profile creation trigger installed successfully"

### Option 2: Manual SQL Fix

If you prefer to run the SQL directly, execute this in your Supabase SQL Editor:

```sql
-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert a new profile for the user
  INSERT INTO public.profiles (id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
```

## Verification

After running the fix, verify the trigger exists:

```sql
-- Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

You should see one row with:
- `trigger_name`: on_auth_user_created
- `event_manipulation`: INSERT
- `event_object_table`: users
- `action_statement`: EXECUTE FUNCTION public.handle_new_user()

## Testing

1. Try to sign up with a new test email
2. The signup should complete successfully
3. Check the `profiles` table to verify a profile was created:

```sql
SELECT id, first_name, last_name, phone, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;
```

## Why This Happens

This issue can occur if:

1. **Initial migrations weren't run**: The trigger was never created
2. **Trigger was accidentally deleted**: Someone ran a DROP command
3. **Permission issues**: The trigger doesn't have proper permissions
4. **Schema conflicts**: The function references the wrong schema

## Prevention

To prevent this in the future:

1. Always run all migrations in order when setting up a new environment
2. Don't manually delete database objects without understanding their purpose
3. Use migration files instead of manual SQL for schema changes
4. Test signup flow after any database changes

## Additional Checks

### Check if profiles table exists

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

Expected columns:
- `id` (uuid, NO)
- `organization_id` (uuid, YES)
- `first_name` (text, YES)
- `last_name` (text, YES)
- `phone` (text, YES)
- `role` (text, YES)
- `license_id` (uuid, YES)
- `created_at` (timestamp with time zone, YES)
- `updated_at` (timestamp with time zone, YES)

### Check RLS policies on profiles

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';
```

Make sure there are policies allowing:
- Users to read their own profile
- Service role to insert profiles
- Users to update their own profile

## Alternative: Disable Email Confirmation (Not Recommended)

If you want to bypass this temporarily for testing:

1. Go to Supabase Dashboard → **Authentication** → **Settings**
2. Scroll to **Email Auth**
3. Uncheck **Enable email confirmations**
4. Click **Save**

**Warning**: This is not recommended for production as it allows anyone to sign up without verifying their email.

## Support

If the issue persists after running the fix:

1. Check Supabase logs:
   - Go to **Logs** → **Postgres Logs**
   - Look for errors related to the trigger or function

2. Check Auth logs:
   - Go to **Logs** → **Auth Logs**
   - Look for failed signup attempts

3. Verify database connection:
   - Check that `NEXT_PUBLIC_SUPABASE_URL` is correct
   - Check that `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct

4. Try creating a profile manually:
   ```sql
   -- After a user signs up (but fails), try this:
   INSERT INTO profiles (id, created_at, updated_at)
   SELECT id, created_at, updated_at
   FROM auth.users
   WHERE id NOT IN (SELECT id FROM profiles);
   ```

## Summary

The "Database error finding user" error is caused by a missing or broken profile creation trigger. Running the migration file `011_fix_profile_creation_trigger.sql` will fix this issue by recreating the trigger with proper error handling and permissions.
