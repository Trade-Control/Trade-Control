-- =====================================================
-- 017 RELIABLE PROFILE CREATION TRIGGER
-- =====================================================
-- This migration creates a robust database trigger for profile creation
-- that addresses the "ghost user" problem when using client-side signUp().
--
-- Key features:
-- 1. SECURITY DEFINER to bypass RLS
-- 2. ON CONFLICT DO NOTHING for idempotency
-- 3. Exception handler to never fail auth
-- 4. Explicit search_path for security

-- Step 1: Drop any existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Create the trigger function with proper security
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with data from user metadata
  -- Uses ON CONFLICT to handle race conditions gracefully
  INSERT INTO public.profiles (id, first_name, last_name, phone, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Unknown'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
    NEW.raw_user_meta_data->>'phone',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Always return NEW to allow the auth operation to continue
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the auth operation
  -- This ensures user creation always succeeds even if profile fails
  RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Step 3: Change function owner to postgres (has full permissions)
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Step 4: Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Grant necessary permissions
-- The function runs as postgres (SECURITY DEFINER), so it has full access
-- But we still grant to ensure service_role can also interact with profiles
GRANT ALL ON public.profiles TO postgres;
GRANT ALL ON public.profiles TO service_role;

-- Step 6: Verify the trigger was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE EXCEPTION 'Trigger on_auth_user_created was not created';
  END IF;
  
  RAISE NOTICE '✅ Trigger on_auth_user_created created successfully';
END $$;

-- Step 7: Verify the function exists with correct properties
DO $$
DECLARE
  func_security TEXT;
BEGIN
  SELECT prosecdef::text INTO func_security
  FROM pg_proc
  WHERE proname = 'handle_new_user';
  
  IF func_security IS NULL THEN
    RAISE EXCEPTION 'Function handle_new_user does not exist';
  END IF;
  
  IF func_security != 'true' THEN
    RAISE WARNING 'Function handle_new_user is not SECURITY DEFINER';
  ELSE
    RAISE NOTICE '✅ Function handle_new_user is SECURITY DEFINER';
  END IF;
END $$;

-- Summary:
-- 1. Created handle_new_user() function with SECURITY DEFINER
-- 2. Function uses ON CONFLICT DO NOTHING for idempotency
-- 3. Function has exception handler to never fail auth
-- 4. Created trigger on_auth_user_created
-- 5. Granted permissions to postgres and service_role
--
-- This trigger will automatically create a profile whenever a user
-- signs up via client-side signUp(), solving the "ghost user" problem.
