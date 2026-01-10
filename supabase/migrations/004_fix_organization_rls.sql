-- =====================================================
-- 004 FIX ORGANIZATION RLS FOR SIGNUP
-- =====================================================
-- This migration creates a database function to handle organization creation
-- during signup, bypassing RLS when needed

-- Drop the function if it exists (in case return type changed)
DROP FUNCTION IF EXISTS create_organization_for_signup(UUID, TEXT, BOOLEAN);

-- Function to create organization during signup
-- Uses SECURITY DEFINER to bypass RLS
CREATE FUNCTION create_organization_for_signup(
  p_user_id UUID,
  p_organization_name TEXT,
  p_onboarding_completed BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organization_id UUID;
  v_organization JSONB;
BEGIN
  -- Check if user already has an organization
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND organization_id IS NOT NULL) THEN
    RAISE EXCEPTION 'User already has an organization';
  END IF;

  -- Create organization
  INSERT INTO organizations (name, onboarding_completed)
  VALUES (p_organization_name, p_onboarding_completed)
  RETURNING id INTO v_organization_id;

  -- Update profile with organization_id and set role to owner
  UPDATE profiles
  SET 
    organization_id = v_organization_id,
    role = 'owner'
  WHERE id = p_user_id;

  -- Fetch and return the full organization record as JSONB
  SELECT to_jsonb(o.*) INTO v_organization
  FROM organizations o
  WHERE o.id = v_organization_id;

  RETURN v_organization;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION create_organization_for_signup(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_for_signup(UUID, TEXT, BOOLEAN) TO anon;
