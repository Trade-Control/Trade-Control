-- =====================================================
-- 005 COMPLETE SIGNUP FUNCTION
-- =====================================================
-- This migration creates a comprehensive function to handle the entire signup process:
-- 1. Create organization
-- 2. Update user profile
-- 3. Create subscription
-- 4. Create owner license
-- All in one transaction, bypassing RLS

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS complete_signup(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS complete_signup(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ);

-- Comprehensive signup function
CREATE FUNCTION complete_signup(
  p_user_id UUID,
  p_organization_name TEXT,
  p_tier TEXT,
  p_operations_pro_level TEXT DEFAULT NULL,
  p_stripe_customer_id TEXT DEFAULT NULL,
  p_stripe_subscription_id TEXT DEFAULT NULL,
  p_base_price NUMERIC DEFAULT 0,
  p_total_price NUMERIC DEFAULT 0,
  p_current_period_start TIMESTAMPTZ DEFAULT NOW(),
  p_current_period_end TIMESTAMPTZ DEFAULT NULL,
  p_trial_ends_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organization_id UUID;
  v_subscription_id UUID;
  v_license_id UUID;
  v_result JSONB;
BEGIN
  -- Check if user already has an organization
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND organization_id IS NOT NULL) THEN
    RAISE EXCEPTION 'User already has an organization';
  END IF;

  -- 1. Create organization
  INSERT INTO organizations (name, onboarding_completed)
  VALUES (p_organization_name, false)
  RETURNING id INTO v_organization_id;

  -- 2. Create subscription
  INSERT INTO subscriptions (
    organization_id,
    stripe_customer_id,
    stripe_subscription_id,
    tier,
    operations_pro_level,
    status,
    base_price,
    total_price,
    current_period_start,
    current_period_end,
    trial_ends_at
  )
  VALUES (
    v_organization_id,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_tier,
    p_operations_pro_level,
    'trialing',
    p_base_price,
    p_total_price,
    p_current_period_start,
    p_current_period_end,
    p_trial_ends_at
  )
  RETURNING id INTO v_subscription_id;

  -- 3. Update organization with subscription_id
  UPDATE organizations
  SET subscription_id = v_subscription_id
  WHERE id = v_organization_id;

  -- 4. Update user profile with organization_id and role
  UPDATE profiles
  SET 
    organization_id = v_organization_id,
    role = 'owner'
  WHERE id = p_user_id;

  -- 5. Create owner license
  INSERT INTO licenses (
    organization_id,
    profile_id,
    license_type,
    status,
    monthly_cost,
    assigned_at
  )
  VALUES (
    v_organization_id,
    p_user_id,
    'owner',
    'active',
    0, -- Owner license is included in base price
    NOW()
  )
  RETURNING id INTO v_license_id;

  -- 6. Update profile with license_id
  UPDATE profiles
  SET license_id = v_license_id
  WHERE id = p_user_id;

  -- Build and return result
  v_result := jsonb_build_object(
    'organization_id', v_organization_id,
    'subscription_id', v_subscription_id,
    'license_id', v_license_id,
    'organization', (SELECT to_jsonb(o.*) FROM organizations o WHERE o.id = v_organization_id),
    'subscription', (SELECT to_jsonb(s.*) FROM subscriptions s WHERE s.id = v_subscription_id)
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION complete_signup(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_signup(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO anon;
