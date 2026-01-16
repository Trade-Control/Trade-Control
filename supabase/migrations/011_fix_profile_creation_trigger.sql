-- =====================================================
-- 011 FIX PROFILE CREATION TRIGGER
-- =====================================================
-- This migration ensures the profile creation trigger works correctly
-- Run this if you're getting "Database error finding user" during signup

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
DECLARE
  v_profile_exists BOOLEAN;
BEGIN
  -- Check if profile already exists (shouldn't happen, but be safe)
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO v_profile_exists;
  
  IF v_profile_exists THEN
    -- Profile already exists, just return
    RAISE NOTICE 'Profile already exists for user %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Insert a new profile for the user
  -- Use explicit column names and handle conflicts gracefully
  INSERT INTO public.profiles (id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  
  -- Verify the insert succeeded
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO v_profile_exists;
  
  IF NOT v_profile_exists THEN
    -- Profile was not created - log detailed error
    RAISE WARNING 'Failed to create profile for user %. User ID: %, Email: %', 
      NEW.id, NEW.id, COALESCE(NEW.email, 'unknown');
  ELSE
    RAISE NOTICE 'Successfully created profile for user %', NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log detailed error information but don't fail the signup
    RAISE WARNING 'Error creating profile for user %: % (SQLSTATE: %)', 
      NEW.id, SQLERRM, SQLSTATE;
    -- Log additional context
    RAISE WARNING 'Error context - User ID: %, Email: %, Error: %', 
      NEW.id, COALESCE(NEW.email, 'unknown'), SQLERRM;
    -- Still return NEW to allow signup to proceed
    -- The signup code will handle missing profile as fallback
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

-- Verify the trigger exists and is enabled
DO $$
DECLARE
  v_trigger_exists BOOLEAN;
  v_trigger_enabled CHAR;
BEGIN
  -- Check if trigger exists
  SELECT EXISTS(
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) INTO v_trigger_exists;
  
  IF NOT v_trigger_exists THEN
    RAISE EXCEPTION 'Trigger on_auth_user_created was not created successfully';
  END IF;
  
  -- Check if trigger is enabled (O = enabled, D = disabled)
  SELECT tgenabled INTO v_trigger_enabled
  FROM pg_trigger
  WHERE tgname = 'on_auth_user_created';
  
  IF v_trigger_enabled != 'O' THEN
    RAISE WARNING 'Trigger on_auth_user_created exists but is disabled (status: %)', v_trigger_enabled;
  END IF;
  
  -- Verify function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE EXCEPTION 'Function handle_new_user was not created successfully';
  END IF;
  
  -- Verify function is SECURITY DEFINER
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user'
    AND prosecdef = true
  ) THEN
    RAISE WARNING 'Function handle_new_user exists but is not SECURITY DEFINER';
  END IF;
  
  RAISE NOTICE 'Profile creation trigger installed successfully';
  RAISE NOTICE 'Trigger status: % (O=enabled, D=disabled)', v_trigger_enabled;
END $$;
