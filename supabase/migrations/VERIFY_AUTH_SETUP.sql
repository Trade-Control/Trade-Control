-- =====================================================
-- VERIFY AUTH SETUP
-- =====================================================
-- Run this to check if the auth system is properly configured
-- This helps diagnose "Database error checking email" issues

-- 1. Check if old trigger exists (should be GONE)
SELECT 
  'TRIGGER CHECK' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS - Old trigger removed'
    ELSE '✗ FAIL - Old trigger still exists! Run migration 014'
  END as status,
  COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 2. Check if old function exists (should be GONE)
SELECT 
  'FUNCTION CHECK' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS - Old function removed'
    ELSE '✗ FAIL - Old function still exists! Run migration 014'
  END as status,
  COUNT(*) as function_count
FROM pg_proc
WHERE proname = 'handle_new_user'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 3. Check if service_role policy exists (should EXIST)
SELECT 
  'SERVICE ROLE POLICY CHECK' as check_type,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ PASS - Service role policy exists'
    ELSE '✗ FAIL - Service role policy missing! Run migration 014'
  END as status,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'profiles'
AND policyname = 'Service role can manage profiles';

-- 4. Check RLS is enabled on profiles (should be ENABLED)
SELECT 
  'RLS CHECK' as check_type,
  CASE 
    WHEN rowsecurity THEN '✓ PASS - RLS is enabled'
    ELSE '✗ FAIL - RLS is disabled'
  END as status,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'profiles';

-- 5. List all policies on profiles table
SELECT 
  'ALL POLICIES' as info_type,
  policyname,
  cmd as operation,
  roles,
  CASE 
    WHEN policyname LIKE '%service%role%' THEN '← SERVICE ROLE POLICY'
    ELSE ''
  END as notes
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 6. Check if profiles table exists and has correct structure
SELECT 
  'PROFILES TABLE' as info_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Test if service_role can insert (this will create a test row)
-- Comment this out if you don't want to create test data
/*
INSERT INTO profiles (id, first_name, last_name, created_at, updated_at)
VALUES (gen_random_uuid(), 'Test', 'ServiceRole', NOW(), NOW())
RETURNING 
  'SERVICE ROLE INSERT TEST' as test_type,
  '✓ PASS - Service role can insert profiles' as status,
  id,
  first_name,
  last_name;
*/

-- Summary
SELECT 
  '=== SUMMARY ===' as summary,
  'If all checks show ✓ PASS, the auth system is properly configured.' as message,
  'If any checks show ✗ FAIL, run migration 014 to fix.' as action;
