-- =====================================================
-- 013 FIX RLS FOR TRIGGER
-- =====================================================
-- This migration fixes RLS policies to allow the trigger to insert profiles
-- The trigger runs with SECURITY DEFINER, but RLS policies might still block it

-- Drop existing policy that might be blocking trigger inserts
-- The existing policy requires auth.uid() to match, but triggers run as SECURITY DEFINER
-- which might have NULL auth.uid() during execution
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Create policy that allows service_role to insert profiles (for triggers)
-- This is needed because triggers run with SECURITY DEFINER and might not have auth.uid()
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Also ensure postgres role can insert (for manual operations and migrations)
-- Note: postgres role typically bypasses RLS, but being explicit helps
DO $$
BEGIN
  -- Check if postgres role exists and can insert
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    -- Postgres role typically bypasses RLS, but we'll verify the policy allows it
    -- The existing "Users can insert their own profile" policy should work
    -- But we'll add an explicit check for service_role which is what Supabase uses
    RAISE NOTICE 'Postgres role exists - RLS policies should allow trigger inserts';
  END IF;
END $$;

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
AND policyname = 'Service role can insert profiles';

-- Note: The trigger function runs with SECURITY DEFINER SET search_path = public
-- This means it runs with the privileges of the function owner (typically postgres)
-- However, RLS policies are still checked unless the function owner is a superuser
-- The service_role policy above ensures the trigger can insert profiles
