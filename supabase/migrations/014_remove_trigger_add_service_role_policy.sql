-- =====================================================
-- 014 REMOVE PROBLEMATIC TRIGGER AND ADD SERVICE ROLE POLICY
-- =====================================================
-- This migration removes the unreliable trigger-based profile creation
-- and adds a policy allowing service_role to manage profiles.
-- 
-- The trigger approach doesn't work reliably in hosted Supabase because:
-- 1. Triggers on auth.users may not fire in all environments
-- 2. RLS policies can block trigger inserts (auth.uid() is NULL during trigger execution)
-- 3. SECURITY DEFINER doesn't always bypass RLS as expected
--
-- The new approach uses server-side API routes with service_role key
-- to create profiles reliably.

-- Step 1: Drop the problematic trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Verify trigger is removed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE EXCEPTION 'Trigger on_auth_user_created was not removed successfully';
  END IF;
  
  RAISE NOTICE 'Trigger removed successfully';
END $$;

-- Step 2: Add policy for service_role to manage profiles
-- This allows the server-side API routes to create/update profiles

-- Drop existing service role policy if it exists
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Create comprehensive policy for service_role
CREATE POLICY "Service role can manage profiles"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 3: Ensure existing policies for authenticated users remain intact
-- These should already exist from the initial migration, but we'll verify

-- Check if user policies exist
DO $$
BEGIN
  -- Verify SELECT policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can view their own profile'
  ) THEN
    RAISE WARNING 'Policy "Users can view their own profile" does not exist';
  END IF;
  
  -- Verify UPDATE policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update their own profile'
  ) THEN
    RAISE WARNING 'Policy "Users can update their own profile" does not exist';
  END IF;
  
  -- Verify INSERT policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can insert their own profile'
  ) THEN
    RAISE WARNING 'Policy "Users can insert their own profile" does not exist';
  END IF;
  
  RAISE NOTICE 'Policy verification complete';
END $$;

-- Step 4: Grant permissions to service_role
GRANT ALL ON public.profiles TO service_role;

-- Step 5: Verify the new policy was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Service role can manage profiles'
  ) THEN
    RAISE EXCEPTION 'Policy "Service role can manage profiles" was not created';
  END IF;
  
  RAISE NOTICE 'Service role policy created successfully';
  RAISE NOTICE 'Migration 014 completed successfully';
  RAISE NOTICE 'Profile creation will now be handled by server-side API routes';
END $$;

-- Summary of changes:
-- 1. Removed on_auth_user_created trigger
-- 2. Removed handle_new_user function
-- 3. Added "Service role can manage profiles" policy
-- 4. Verified existing user policies remain intact
--
-- Next steps:
-- 1. Ensure SUPABASE_SERVICE_ROLE_KEY is set in environment variables
-- 2. Test signup flow through the new /api/auth/signup endpoint
-- 3. Test login flow to ensure ensure-profile works for existing users
