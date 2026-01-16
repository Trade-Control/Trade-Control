-- =====================================================
-- 012 DIAGNOSE SIGNUP ISSUE
-- =====================================================
-- Diagnostic queries to identify why signup is failing
-- Run these queries in Supabase SQL Editor to diagnose the issue

-- 1. Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 2. Check if function exists and its properties
SELECT 
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
AND routine_schema = 'public';

-- 3. Check profiles table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check RLS policies on profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 5. Check if RLS is enabled on profiles table
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'profiles';

-- 6. Check function permissions and owner
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  r.rolname as owner,
  p.proacl as access_privileges
FROM pg_proc p
JOIN pg_roles r ON p.proowner = r.oid
WHERE p.proname = 'handle_new_user';

-- 7. Check recent signup attempts (if any users exist)
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 8. Check if profiles exist for recent users
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.created_at,
  u.email,
  u.created_at as user_created_at
FROM profiles p
RIGHT JOIN auth.users u ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;

-- 9. Test manual profile insertion (as current user)
-- This will help identify if it's an RLS issue
-- Note: This might fail if RLS policies are too restrictive
INSERT INTO profiles (id, created_at, updated_at)
VALUES (gen_random_uuid(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING
RETURNING *;

-- 10. Check for any errors in PostgreSQL logs
-- Note: This requires access to Supabase logs dashboard
-- Go to: Supabase Dashboard > Logs > Postgres Logs
-- Look for errors related to 'handle_new_user' or 'on_auth_user_created'

-- 11. Verify trigger is enabled
SELECT 
  tgname as trigger_name,
  tgenabled as is_enabled,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Expected Results:
-- Trigger should exist and be enabled ('O' = enabled)
-- Function should exist with SECURITY DEFINER = true
-- RLS should be enabled on profiles table
-- There should be policies allowing INSERT for authenticated users or service_role
-- Function owner should be postgres or service_role
