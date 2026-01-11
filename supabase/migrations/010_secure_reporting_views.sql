-- =====================================================
-- 010 SECURE REPORTING VIEWS AND FUNCTIONS
-- =====================================================
-- This migration replaces insecure views with secure 
-- functions that properly enforce Row Level Security.
--
-- SECURITY CONCERNS ADDRESSED:
-- 1. Views in PostgreSQL don't respect RLS by default
-- 2. Direct access to v_financial_summary and v_job_summary
--    could expose data across organizations
-- 3. SQL injection is not a concern with views (they're 
--    pre-compiled), but data isolation IS a concern
--
-- SOLUTION:
-- Replace views with SECURITY DEFINER functions that:
-- 1. Verify the user's organization
-- 2. Only return data for the user's organization
-- 3. Respect role-based access controls

-- =====================================================
-- 1. DROP EXISTING INSECURE VIEWS
-- =====================================================

DROP VIEW IF EXISTS v_financial_summary CASCADE;
DROP VIEW IF EXISTS v_job_summary CASCADE;

-- =====================================================
-- 2. CREATE SECURE FUNCTION FOR FINANCIAL SUMMARY
-- =====================================================

-- Function to get financial summary for the authenticated user's organization
CREATE OR REPLACE FUNCTION get_financial_summary(
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  month TIMESTAMPTZ,
  total_invoices BIGINT,
  paid_invoices BIGINT,
  overdue_invoices BIGINT,
  total_invoiced DECIMAL(12,2),
  total_paid DECIMAL(12,2),
  total_outstanding DECIMAL(12,2),
  avg_invoice_value DECIMAL(12,2)
) AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_role TEXT;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user's organization and role
  SELECT organization_id, role INTO v_org_id, v_role
  FROM profiles
  WHERE id = v_user_id;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User has no organization';
  END IF;
  
  -- Only owners and management can access financial summary
  IF v_role NOT IN ('owner', 'management') THEN
    RAISE EXCEPTION 'Insufficient permissions to access financial data';
  END IF;
  
  -- Return the financial summary for the user's organization only
  RETURN QUERY
  SELECT 
    DATE_TRUNC('month', i.invoice_date) as month,
    COUNT(DISTINCT i.id)::BIGINT as total_invoices,
    COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END)::BIGINT as paid_invoices,
    COUNT(DISTINCT CASE WHEN i.status = 'overdue' THEN i.id END)::BIGINT as overdue_invoices,
    COALESCE(SUM(i.total_amount), 0)::DECIMAL(12,2) as total_invoiced,
    COALESCE(SUM(i.amount_paid), 0)::DECIMAL(12,2) as total_paid,
    COALESCE(SUM(i.total_amount - i.amount_paid), 0)::DECIMAL(12,2) as total_outstanding,
    COALESCE(AVG(i.total_amount), 0)::DECIMAL(12,2) as avg_invoice_value
  FROM invoices i
  WHERE i.organization_id = v_org_id
    AND i.deleted_at IS NULL
    AND (p_date_from IS NULL OR i.invoice_date >= p_date_from)
    AND (p_date_to IS NULL OR i.invoice_date <= p_date_to)
  GROUP BY DATE_TRUNC('month', i.invoice_date)
  ORDER BY month DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_financial_summary TO authenticated;

-- =====================================================
-- 3. CREATE SECURE FUNCTION FOR JOB SUMMARY
-- =====================================================

-- Function to get job summary for the authenticated user's organization
-- Field staff only see their assigned jobs
CREATE OR REPLACE FUNCTION get_job_summary(
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  month TIMESTAMPTZ,
  total_jobs BIGINT,
  completed_jobs BIGINT,
  active_jobs BIGINT,
  quoted_jobs BIGINT,
  avg_completion_days DECIMAL(10,2)
) AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_role TEXT;
  v_assigned_jobs UUID[];
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user's organization, role, and assigned jobs
  SELECT 
    organization_id, 
    role,
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(assigned_job_ids, '[]'::jsonb))::UUID)
  INTO v_org_id, v_role, v_assigned_jobs
  FROM profiles
  WHERE id = v_user_id;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User has no organization';
  END IF;
  
  -- Return job summary based on role
  IF v_role IN ('owner', 'management') THEN
    -- Full organization access
    RETURN QUERY
    SELECT 
      DATE_TRUNC('month', j.created_at) as month,
      COUNT(DISTINCT j.id)::BIGINT as total_jobs,
      COUNT(DISTINCT CASE WHEN j.status = 'completed' THEN j.id END)::BIGINT as completed_jobs,
      COUNT(DISTINCT CASE WHEN j.status = 'in_progress' THEN j.id END)::BIGINT as active_jobs,
      COUNT(DISTINCT CASE WHEN j.status = 'quoted' THEN j.id END)::BIGINT as quoted_jobs,
      COALESCE(AVG(
        CASE WHEN j.start_date IS NOT NULL AND j.completed_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (j.completed_at - j.start_date))/86400
        END
      ), 0)::DECIMAL(10,2) as avg_completion_days
    FROM jobs j
    WHERE j.organization_id = v_org_id
      AND (p_date_from IS NULL OR j.created_at >= p_date_from)
      AND (p_date_to IS NULL OR j.created_at <= p_date_to + INTERVAL '1 day')
    GROUP BY DATE_TRUNC('month', j.created_at)
    ORDER BY month DESC;
  ELSE
    -- Field staff: only assigned jobs
    RETURN QUERY
    SELECT 
      DATE_TRUNC('month', j.created_at) as month,
      COUNT(DISTINCT j.id)::BIGINT as total_jobs,
      COUNT(DISTINCT CASE WHEN j.status = 'completed' THEN j.id END)::BIGINT as completed_jobs,
      COUNT(DISTINCT CASE WHEN j.status = 'in_progress' THEN j.id END)::BIGINT as active_jobs,
      COUNT(DISTINCT CASE WHEN j.status = 'quoted' THEN j.id END)::BIGINT as quoted_jobs,
      COALESCE(AVG(
        CASE WHEN j.start_date IS NOT NULL AND j.completed_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (j.completed_at - j.start_date))/86400
        END
      ), 0)::DECIMAL(10,2) as avg_completion_days
    FROM jobs j
    WHERE j.organization_id = v_org_id
      AND j.id = ANY(v_assigned_jobs)
      AND (p_date_from IS NULL OR j.created_at >= p_date_from)
      AND (p_date_to IS NULL OR j.created_at <= p_date_to + INTERVAL '1 day')
    GROUP BY DATE_TRUNC('month', j.created_at)
    ORDER BY month DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_job_summary TO authenticated;

-- =====================================================
-- 4. CREATE SECURE FUNCTION FOR CONTRACTOR COMPLIANCE
-- =====================================================

CREATE OR REPLACE FUNCTION get_contractor_compliance_summary()
RETURNS TABLE (
  total_contractors BIGINT,
  compliant_contractors BIGINT,
  non_compliant_contractors BIGINT,
  expiring_soon BIGINT,
  blocked BIGINT,
  compliance_rate DECIMAL(5,2)
) AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_role TEXT;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user's organization and role
  SELECT organization_id, role INTO v_org_id, v_role
  FROM profiles
  WHERE id = v_user_id;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User has no organization';
  END IF;
  
  -- Only owners and management can access contractor compliance
  IF v_role NOT IN ('owner', 'management') THEN
    RAISE EXCEPTION 'Insufficient permissions to access contractor data';
  END IF;
  
  RETURN QUERY
  WITH compliance_data AS (
    SELECT 
      c.id,
      c.status,
      CASE 
        WHEN c.status = 'blocked' THEN false
        WHEN c.insurance_expiry IS NOT NULL AND c.insurance_expiry < CURRENT_DATE THEN false
        WHEN c.license_expiry IS NOT NULL AND c.license_expiry < CURRENT_DATE THEN false
        ELSE true
      END as is_compliant,
      CASE 
        WHEN c.insurance_expiry IS NOT NULL AND c.insurance_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN true
        WHEN c.license_expiry IS NOT NULL AND c.license_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN true
        ELSE false
      END as expiring_soon
    FROM contractors c
    WHERE c.organization_id = v_org_id
  )
  SELECT 
    COUNT(*)::BIGINT as total_contractors,
    COUNT(*) FILTER (WHERE is_compliant)::BIGINT as compliant_contractors,
    COUNT(*) FILTER (WHERE NOT is_compliant)::BIGINT as non_compliant_contractors,
    COUNT(*) FILTER (WHERE expiring_soon)::BIGINT as expiring_soon,
    COUNT(*) FILTER (WHERE status = 'blocked')::BIGINT as blocked,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE is_compliant)::DECIMAL * 100 / COUNT(*))::DECIMAL(5,2)
      ELSE 100.00
    END as compliance_rate
  FROM compliance_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_contractor_compliance_summary TO authenticated;

-- =====================================================
-- 5. CREATE SECURE FUNCTION FOR INVENTORY SUMMARY
-- =====================================================

CREATE OR REPLACE FUNCTION get_inventory_summary()
RETURNS TABLE (
  total_items BIGINT,
  total_value DECIMAL(12,2),
  low_stock_items BIGINT,
  out_of_stock_items BIGINT
) AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_role TEXT;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user's organization and role
  SELECT organization_id, role INTO v_org_id, v_role
  FROM profiles
  WHERE id = v_user_id;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User has no organization';
  END IF;
  
  -- Only owners and management can access inventory summary
  IF v_role NOT IN ('owner', 'management') THEN
    RAISE EXCEPTION 'Insufficient permissions to access inventory data';
  END IF;
  
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_items,
    COALESCE(SUM(i.quantity * COALESCE(i.unit_cost, 0)), 0)::DECIMAL(12,2) as total_value,
    COUNT(*) FILTER (
      WHERE i.reorder_level IS NOT NULL 
      AND i.quantity <= i.reorder_level 
      AND i.quantity > 0
    )::BIGINT as low_stock_items,
    COUNT(*) FILTER (WHERE i.quantity <= 0)::BIGINT as out_of_stock_items
  FROM inventory i
  WHERE i.organization_id = v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_inventory_summary TO authenticated;

-- =====================================================
-- 6. CREATE SECURE FUNCTION FOR TIMESHEET SUMMARY
-- =====================================================

-- Timesheet summary respects field staff limitations
CREATE OR REPLACE FUNCTION get_timesheet_summary(
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  total_entries BIGINT,
  total_hours DECIMAL(10,2),
  avg_hours_per_entry DECIMAL(10,2),
  unique_users BIGINT
) AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_role TEXT;
  v_assigned_jobs UUID[];
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user's organization, role, and assigned jobs
  SELECT 
    organization_id, 
    role,
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(assigned_job_ids, '[]'::jsonb))::UUID)
  INTO v_org_id, v_role, v_assigned_jobs
  FROM profiles
  WHERE id = v_user_id;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User has no organization';
  END IF;
  
  IF v_role IN ('owner', 'management') THEN
    -- Full organization access
    RETURN QUERY
    SELECT 
      COUNT(*)::BIGINT as total_entries,
      COALESCE(SUM(
        EXTRACT(EPOCH FROM (t.clock_out - t.clock_in)) / 3600
      ), 0)::DECIMAL(10,2) as total_hours,
      COALESCE(AVG(
        EXTRACT(EPOCH FROM (t.clock_out - t.clock_in)) / 3600
      ), 0)::DECIMAL(10,2) as avg_hours_per_entry,
      COUNT(DISTINCT t.user_id)::BIGINT as unique_users
    FROM timesheets t
    WHERE t.organization_id = v_org_id
      AND t.clock_out IS NOT NULL
      AND (p_date_from IS NULL OR t.clock_in >= p_date_from)
      AND (p_date_to IS NULL OR t.clock_in <= p_date_to + INTERVAL '1 day');
  ELSE
    -- Field staff: only their own timesheets on assigned jobs
    RETURN QUERY
    SELECT 
      COUNT(*)::BIGINT as total_entries,
      COALESCE(SUM(
        EXTRACT(EPOCH FROM (t.clock_out - t.clock_in)) / 3600
      ), 0)::DECIMAL(10,2) as total_hours,
      COALESCE(AVG(
        EXTRACT(EPOCH FROM (t.clock_out - t.clock_in)) / 3600
      ), 0)::DECIMAL(10,2) as avg_hours_per_entry,
      1::BIGINT as unique_users
    FROM timesheets t
    WHERE t.organization_id = v_org_id
      AND t.user_id = v_user_id
      AND t.job_id = ANY(v_assigned_jobs)
      AND t.clock_out IS NOT NULL
      AND (p_date_from IS NULL OR t.clock_in >= p_date_from)
      AND (p_date_to IS NULL OR t.clock_in <= p_date_to + INTERVAL '1 day');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_timesheet_summary TO authenticated;

-- =====================================================
-- 7. REVOKE DIRECT TABLE ACCESS FROM PUBLIC
-- =====================================================

-- Ensure anon role cannot access these tables directly
REVOKE ALL ON TABLE invoices FROM anon;
REVOKE ALL ON TABLE jobs FROM anon;
REVOKE ALL ON TABLE contractors FROM anon;
REVOKE ALL ON TABLE inventory FROM anon;
REVOKE ALL ON TABLE timesheets FROM anon;
REVOKE ALL ON TABLE quotes FROM anon;
REVOKE ALL ON TABLE invoice_payments FROM anon;
REVOKE ALL ON TABLE audit_logs FROM anon;

-- =====================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION get_financial_summary IS 'Secure function to get financial summary. Only accessible by owners and management. Automatically filters by user organization.';
COMMENT ON FUNCTION get_job_summary IS 'Secure function to get job summary. Owners/management see all org jobs, field staff see only assigned jobs.';
COMMENT ON FUNCTION get_contractor_compliance_summary IS 'Secure function to get contractor compliance data. Only accessible by owners and management.';
COMMENT ON FUNCTION get_inventory_summary IS 'Secure function to get inventory summary. Only accessible by owners and management.';
COMMENT ON FUNCTION get_timesheet_summary IS 'Secure function to get timesheet summary. Respects role-based access - field staff see only their own data.';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
