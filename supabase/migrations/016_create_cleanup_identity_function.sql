-- =====================================================
-- 016 CREATE CLEANUP IDENTITY FUNCTION
-- =====================================================
-- Creates a function to clean up orphaned/duplicate identities for a specific email
-- This can be called from the API to fix identity issues before signup

CREATE OR REPLACE FUNCTION cleanup_identities_for_email(target_email TEXT)
RETURNS TABLE(
  cleaned_orphaned INTEGER,
  cleaned_duplicates INTEGER,
  remaining_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  orphaned_count INTEGER := 0;
  duplicate_count INTEGER := 0;
  final_count INTEGER := 0;
BEGIN
  -- Delete orphaned identities for this email
  WITH deleted_orphaned AS (
    DELETE FROM auth.identities
    WHERE id IN (
      SELECT i.id
      FROM auth.identities i
      LEFT JOIN auth.users u ON u.id = i.user_id
      WHERE u.id IS NULL
      AND lower(i.email) = lower(target_email)
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO orphaned_count FROM deleted_orphaned;

  -- Delete duplicate identities for this email (keep oldest)
  WITH ranked AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (PARTITION BY lower(email) ORDER BY created_at ASC) as rn
    FROM auth.identities
    WHERE lower(email) = lower(target_email)
  ),
  deleted_duplicates AS (
    DELETE FROM auth.identities
    WHERE id IN (
      SELECT id FROM ranked WHERE rn > 1
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO duplicate_count FROM deleted_duplicates;

  -- Count remaining identities for this email
  SELECT COUNT(*) INTO final_count
  FROM auth.identities
  WHERE lower(email) = lower(target_email);

  RETURN QUERY SELECT orphaned_count, duplicate_count, final_count;
END;
$$;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION cleanup_identities_for_email(TEXT) TO service_role;
