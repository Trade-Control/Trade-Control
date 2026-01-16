-- =====================================================
-- FORCE CLEANUP - Run this NOW to fix "Database connection error"
-- =====================================================
-- This script aggressively removes ALL traces of the old trigger system
-- and sets up the service_role policy properly.

-- STEP 1: Force remove ALL triggers on auth.users
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  FOR trigger_record IN 
    SELECT tgname 
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth' 
    AND c.relname = 'users'
    AND tgname LIKE '%auth_user%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users CASCADE', trigger_record.tgname);
    RAISE NOTICE 'Dropped trigger: %', trigger_record.tgname;
  END LOOP;
END $$;

-- STEP 2: Force remove ALL related functions
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN 
    SELECT proname, oidvectortypes(proargtypes) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND proname LIKE '%new_user%'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', func_record.proname, func_record.args);
    RAISE NOTICE 'Dropped function: %', func_record.proname;
  END LOOP;
END $$;

-- STEP 3: Explicitly drop known problematic items
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user(uuid, jsonb) CASCADE;

-- STEP 4: Clean up any orphaned policies
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Allow service role to insert profiles" ON profiles;

-- STEP 5: Create the correct service_role policy
CREATE POLICY "Service role can manage profiles"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- STEP 6: Grant all necessary permissions
GRANT ALL ON public.profiles TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- STEP 7: Verify everything is clean
DO $$
DECLARE
  trigger_count INTEGER;
  function_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Check triggers
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'auth' 
  AND c.relname = 'users'
  AND tgname LIKE '%auth_user%';
  
  IF trigger_count > 0 THEN
    RAISE WARNING 'WARNING: % triggers still exist on auth.users', trigger_count;
  ELSE
    RAISE NOTICE '✓ All triggers removed from auth.users';
  END IF;
  
  -- Check functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND proname LIKE '%new_user%';
  
  IF function_count > 0 THEN
    RAISE WARNING 'WARNING: % functions still exist', function_count;
  ELSE
    RAISE NOTICE '✓ All related functions removed';
  END IF;
  
  -- Check service_role policy
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles'
  AND policyname = 'Service role can manage profiles';
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'FAILED: Service role policy was not created!';
  ELSE
    RAISE NOTICE '✓ Service role policy exists';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓✓✓ CLEANUP COMPLETE ✓✓✓';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Restart your dev server';
  RAISE NOTICE '2. Try signing up again';
  RAISE NOTICE '3. The "Database connection error" should be gone';
END $$;

-- STEP 8: Show current state
SELECT 
  '=== CURRENT POLICIES ON PROFILES ===' as info,
  policyname,
  cmd,
  roles::text
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
