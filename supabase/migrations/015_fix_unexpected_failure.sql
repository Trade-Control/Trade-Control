-- =====================================================
-- 015 FIX UNEXPECTED FAILURE ERROR
-- =====================================================
-- This migration fixes the "unexpected_failure" error during signup
-- which is typically caused by triggers or constraints on auth.users

-- Step 1: Remove ALL triggers on auth.users (most common cause)
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
    AND NOT t.tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users CASCADE', trigger_record.tgname);
    RAISE NOTICE 'Dropped trigger: %', trigger_record.tgname;
  END LOOP;
END $$;

-- Step 2: Remove handle_new_user function if it exists
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user(uuid, jsonb) CASCADE;

-- Step 3: Ensure service_role policy exists
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;
CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.profiles TO service_role;

-- Step 4: Verify cleanup
SELECT 
  'TRIGGER CHECK' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN 'SUCCESS - No triggers on auth.users'
    ELSE 'WARNING - ' || COUNT(*) || ' trigger(s) still exist'
  END as status,
  string_agg(tgname, ', ') as trigger_names
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' 
AND c.relname = 'users'
AND NOT t.tgisinternal;

-- Step 5: Check for any constraints that might block user creation
SELECT 
  'CONSTRAINT CHECK' as check_type,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'auth.users'::regclass
AND contype IN ('c', 'f', 'u', 'p')
ORDER BY contype, conname;
