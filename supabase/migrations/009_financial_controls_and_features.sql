-- =====================================================
-- 009 FINANCIAL CONTROLS AND SUBSCRIPTION LOGIC
-- =====================================================
-- This migration adds payment tracking, audit controls, 
-- subscription expiry logic, and enhanced financial features.

-- =====================================================
-- 1. ENHANCE INVOICES TABLE WITH PAYMENT TRACKING
-- =====================================================

-- Add payment tracking fields to invoices
DO $$ 
BEGIN
  -- Deposit and partial payment support
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'deposit_amount') THEN
    ALTER TABLE invoices ADD COLUMN deposit_amount DECIMAL(10,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'deposit_paid') THEN
    ALTER TABLE invoices ADD COLUMN deposit_paid BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'deposit_paid_date') THEN
    ALTER TABLE invoices ADD COLUMN deposit_paid_date TIMESTAMPTZ;
  END IF;
END $$;

-- Create payments table for tracking multiple payments
CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT, -- 'cash', 'card', 'bank_transfer', 'check', 'other'
  reference_number TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_organization ON invoice_payments(organization_id, payment_date DESC);

-- Enable RLS
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org's payments" ON invoice_payments;
CREATE POLICY "Users can view their org's payments"
  ON invoice_payments FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Management can record payments" ON invoice_payments;
CREATE POLICY "Management can record payments"
  ON invoice_payments FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'management')
    )
  );

DROP POLICY IF EXISTS "Management can update payments" ON invoice_payments;
CREATE POLICY "Management can update payments"
  ON invoice_payments FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'management')
    )
  );

-- =====================================================
-- 2. ADD QUOTE AND INVOICE STATUS ENHANCEMENTS
-- =====================================================

-- Add deleted_at for soft deletes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'deleted_at') THEN
    ALTER TABLE quotes ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'deleted_at') THEN
    ALTER TABLE invoices ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
  
  -- Add fields to track edits
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'last_edited_by') THEN
    ALTER TABLE quotes ADD COLUMN last_edited_by UUID REFERENCES profiles(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'last_edited_by') THEN
    ALTER TABLE invoices ADD COLUMN last_edited_by UUID REFERENCES profiles(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'last_edited_at') THEN
    ALTER TABLE quotes ADD COLUMN last_edited_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'last_edited_at') THEN
    ALTER TABLE invoices ADD COLUMN last_edited_at TIMESTAMPTZ;
  END IF;
  
  -- Add version tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'version') THEN
    ALTER TABLE quotes ADD COLUMN version INTEGER DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'version') THEN
    ALTER TABLE invoices ADD COLUMN version INTEGER DEFAULT 1;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at ON quotes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- 3. SUBSCRIPTION EXPIRY AND READ-ONLY ACCESS
-- =====================================================

-- Add subscription expiry fields
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'expired_at') THEN
    ALTER TABLE subscriptions ADD COLUMN expired_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'grace_period_ends') THEN
    ALTER TABLE subscriptions ADD COLUMN grace_period_ends TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'read_only_mode') THEN
    ALTER TABLE subscriptions ADD COLUMN read_only_mode BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add account status to profiles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_status') THEN
    ALTER TABLE profiles ADD COLUMN account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deactivated'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'deactivated_at') THEN
    ALTER TABLE profiles ADD COLUMN deactivated_at TIMESTAMPTZ;
  END IF;
END $$;

-- Function to handle subscription expiry
CREATE OR REPLACE FUNCTION handle_subscription_expiry()
RETURNS void AS $$
BEGIN
  -- Set expired subscriptions to read-only mode with 30-day grace period
  UPDATE subscriptions
  SET 
    expired_at = NOW(),
    grace_period_ends = NOW() + INTERVAL '30 days',
    read_only_mode = true,
    status = 'cancelled'
  WHERE 
    status = 'active'
    AND current_period_end < NOW()
    AND expired_at IS NULL;
  
  -- Deactivate field staff accounts after grace period
  UPDATE profiles
  SET 
    account_status = 'deactivated',
    deactivated_at = NOW()
  WHERE 
    role = 'field_staff'
    AND organization_id IN (
      SELECT organization_id 
      FROM subscriptions 
      WHERE grace_period_ends < NOW()
      AND read_only_mode = true
    )
    AND account_status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if organization is in read-only mode
CREATE OR REPLACE FUNCTION is_organization_read_only(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_read_only BOOLEAN;
BEGIN
  SELECT COALESCE(read_only_mode, false)
  INTO v_read_only
  FROM subscriptions
  WHERE organization_id = org_id;
  
  RETURN COALESCE(v_read_only, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. ROLE-BASED AUDIT TRAIL ENHANCEMENTS
-- =====================================================

-- Update audit_logs RLS policies for role-based access
DROP POLICY IF EXISTS "Users can view their org's audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Only owners can view all audit logs" ON audit_logs;

-- Owner can see everything
CREATE POLICY "Owners can view all org audit logs"
  ON audit_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Management can see job-related and general organization audits
CREATE POLICY "Management can view org and job audit logs"
  ON audit_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role = 'management'
    )
  );

-- Field staff can only see audits for their assigned jobs
CREATE POLICY "Field staff can view their job audit logs"
  ON audit_logs FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'field_staff'
    AND job_id IS NOT NULL
    AND job_id::text = ANY(
      SELECT jsonb_array_elements_text(assigned_job_ids) 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 5. ADD REPORTING TABLES AND VIEWS
-- =====================================================

-- Create reporting snapshot table
CREATE TABLE IF NOT EXISTS reporting_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL,
  snapshot_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reporting_snapshots_org_date ON reporting_snapshots(organization_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_reporting_snapshots_type ON reporting_snapshots(snapshot_type, snapshot_date DESC);

-- Enable RLS
ALTER TABLE reporting_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Management and owners can view reports" ON reporting_snapshots;
CREATE POLICY "Management and owners can view reports"
  ON reporting_snapshots FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'management')
    )
  );

-- Create view for financial summary
CREATE OR REPLACE VIEW v_financial_summary AS
SELECT 
  i.organization_id,
  DATE_TRUNC('month', i.invoice_date) as month,
  COUNT(DISTINCT i.id) as total_invoices,
  COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END) as paid_invoices,
  COUNT(DISTINCT CASE WHEN i.status = 'overdue' THEN i.id END) as overdue_invoices,
  SUM(i.total_amount) as total_invoiced,
  SUM(i.amount_paid) as total_paid,
  SUM(i.total_amount - i.amount_paid) as total_outstanding,
  AVG(i.total_amount) as avg_invoice_value
FROM invoices i
WHERE i.deleted_at IS NULL
GROUP BY i.organization_id, DATE_TRUNC('month', i.invoice_date);

-- Create view for job summary
CREATE OR REPLACE VIEW v_job_summary AS
SELECT 
  j.organization_id,
  DATE_TRUNC('month', j.created_at) as month,
  COUNT(DISTINCT j.id) as total_jobs,
  COUNT(DISTINCT CASE WHEN j.status = 'completed' THEN j.id END) as completed_jobs,
  COUNT(DISTINCT CASE WHEN j.status = 'in_progress' THEN j.id END) as active_jobs,
  COUNT(DISTINCT CASE WHEN j.status = 'quoted' THEN j.id END) as quoted_jobs,
  AVG(EXTRACT(EPOCH FROM (j.completed_at - j.start_date))/86400) as avg_completion_days
FROM jobs j
GROUP BY j.organization_id, DATE_TRUNC('month', j.created_at);

-- =====================================================
-- 6. ADD INVENTORY ALLOCATION ENHANCEMENTS
-- =====================================================

-- Add search index for inventory
CREATE INDEX IF NOT EXISTS idx_inventory_search ON inventory USING gin(to_tsvector('english', item_name || ' ' || COALESCE(description, '') || ' ' || COALESCE(sku, '')));

-- Add job allocation status
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_inventory_allocations' AND column_name = 'status') THEN
    ALTER TABLE job_inventory_allocations ADD COLUMN status TEXT DEFAULT 'allocated' CHECK (status IN ('allocated', 'used', 'returned', 'cancelled'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_inventory_allocations' AND column_name = 'quantity_used') THEN
    ALTER TABLE job_inventory_allocations ADD COLUMN quantity_used DECIMAL(10,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_inventory_allocations' AND column_name = 'quantity_returned') THEN
    ALTER TABLE job_inventory_allocations ADD COLUMN quantity_returned DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- =====================================================
-- 7. TRIGGER FUNCTIONS FOR AUDIT LOGGING
-- =====================================================

-- Trigger function for quote changes
CREATE OR REPLACE FUNCTION audit_quote_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_action TEXT;
  v_description TEXT;
  v_metadata JSONB;
BEGIN
  v_user_id := auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_description := 'Quote created: ' || NEW.quote_number;
    v_metadata := jsonb_build_object(
      'quote_number', NEW.quote_number,
      'status', NEW.status,
      'total_amount', NEW.total_amount
    );
    
    PERFORM log_audit_event(
      NEW.organization_id,
      v_user_id,
      v_action,
      'quote',
      NEW.id,
      NEW.job_id,
      v_description,
      v_metadata
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    
    IF OLD.status != NEW.status THEN
      v_description := 'Quote status changed from ' || OLD.status || ' to ' || NEW.status;
      v_metadata := jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'quote_number', NEW.quote_number
      );
    ELSIF OLD.total_amount != NEW.total_amount THEN
      v_description := 'Quote amount updated';
      v_metadata := jsonb_build_object(
        'old_amount', OLD.total_amount,
        'new_amount', NEW.total_amount,
        'quote_number', NEW.quote_number
      );
    ELSIF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      v_description := 'Quote deleted: ' || NEW.quote_number;
      v_metadata := jsonb_build_object(
        'quote_number', NEW.quote_number,
        'total_amount', NEW.total_amount
      );
    ELSE
      v_description := 'Quote updated: ' || NEW.quote_number;
      v_metadata := jsonb_build_object('quote_number', NEW.quote_number);
    END IF;
    
    PERFORM log_audit_event(
      NEW.organization_id,
      v_user_id,
      v_action,
      'quote',
      NEW.id,
      NEW.job_id,
      v_description,
      v_metadata
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for invoice changes
CREATE OR REPLACE FUNCTION audit_invoice_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_action TEXT;
  v_description TEXT;
  v_metadata JSONB;
BEGIN
  v_user_id := auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_description := 'Invoice created: ' || NEW.invoice_number;
    v_metadata := jsonb_build_object(
      'invoice_number', NEW.invoice_number,
      'status', NEW.status,
      'total_amount', NEW.total_amount
    );
    
    PERFORM log_audit_event(
      NEW.organization_id,
      v_user_id,
      v_action,
      'invoice',
      NEW.id,
      NEW.job_id,
      v_description,
      v_metadata
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    
    IF OLD.status != NEW.status THEN
      v_description := 'Invoice status changed from ' || OLD.status || ' to ' || NEW.status;
      v_metadata := jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'invoice_number', NEW.invoice_number
      );
    ELSIF OLD.amount_paid != NEW.amount_paid THEN
      v_description := 'Payment recorded on invoice ' || NEW.invoice_number;
      v_metadata := jsonb_build_object(
        'old_amount_paid', OLD.amount_paid,
        'new_amount_paid', NEW.amount_paid,
        'invoice_number', NEW.invoice_number
      );
    ELSIF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      v_description := 'Invoice deleted: ' || NEW.invoice_number;
      v_metadata := jsonb_build_object(
        'invoice_number', NEW.invoice_number,
        'total_amount', NEW.total_amount
      );
    ELSE
      v_description := 'Invoice updated: ' || NEW.invoice_number;
      v_metadata := jsonb_build_object('invoice_number', NEW.invoice_number);
    END IF;
    
    PERFORM log_audit_event(
      NEW.organization_id,
      v_user_id,
      v_action,
      'invoice',
      NEW.id,
      NEW.job_id,
      v_description,
      v_metadata
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for payment logging
CREATE OR REPLACE FUNCTION audit_payment_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice RECORD;
BEGIN
  -- Get invoice details
  SELECT * INTO v_invoice FROM invoices WHERE id = NEW.invoice_id;
  
  PERFORM log_audit_event(
    NEW.organization_id,
    NEW.recorded_by,
    'create',
    'payment',
    NEW.id,
    v_invoice.job_id,
    'Payment recorded: $' || NEW.amount || ' for invoice ' || v_invoice.invoice_number,
    jsonb_build_object(
      'invoice_number', v_invoice.invoice_number,
      'amount', NEW.amount,
      'payment_method', NEW.payment_method,
      'reference_number', NEW.reference_number
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_audit_quote_changes ON quotes;
CREATE TRIGGER trigger_audit_quote_changes
  AFTER INSERT OR UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION audit_quote_changes();

DROP TRIGGER IF EXISTS trigger_audit_invoice_changes ON invoices;
CREATE TRIGGER trigger_audit_invoice_changes
  AFTER INSERT OR UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION audit_invoice_changes();

DROP TRIGGER IF EXISTS trigger_audit_payment_changes ON invoice_payments;
CREATE TRIGGER trigger_audit_payment_changes
  AFTER INSERT ON invoice_payments
  FOR EACH ROW EXECUTE FUNCTION audit_payment_changes();

-- =====================================================
-- 8. UPDATE FUNCTIONS FOR AUTOMATIC CALCULATIONS
-- =====================================================

-- Function to update invoice amount_paid based on payments
CREATE OR REPLACE FUNCTION update_invoice_payment_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid DECIMAL(10,2);
  v_invoice RECORD;
BEGIN
  -- Calculate total paid for this invoice
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM invoice_payments
  WHERE invoice_id = NEW.invoice_id;
  
  -- Get invoice details
  SELECT * INTO v_invoice FROM invoices WHERE id = NEW.invoice_id;
  
  -- Update invoice
  UPDATE invoices
  SET 
    amount_paid = v_total_paid,
    status = CASE 
      WHEN v_total_paid >= total_amount THEN 'paid'
      WHEN v_total_paid > 0 THEN 'sent' -- Partially paid
      ELSE status
    END,
    paid_at = CASE 
      WHEN v_total_paid >= total_amount THEN NOW()
      ELSE paid_at
    END
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_invoice_payment_totals ON invoice_payments;
CREATE TRIGGER trigger_update_invoice_payment_totals
  AFTER INSERT OR UPDATE OR DELETE ON invoice_payments
  FOR EACH ROW EXECUTE FUNCTION update_invoice_payment_totals();

-- =====================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE invoice_payments IS 'Tracks individual payments against invoices for deposits and partial payments';
COMMENT ON TABLE reporting_snapshots IS 'Stores periodic reporting data snapshots for performance';
COMMENT ON COLUMN invoices.deposit_amount IS 'Required deposit amount for the invoice';
COMMENT ON COLUMN invoices.deposit_paid IS 'Whether the deposit has been paid';
COMMENT ON COLUMN subscriptions.read_only_mode IS 'Organization in read-only mode after subscription expiry';
COMMENT ON COLUMN subscriptions.grace_period_ends IS '30-day grace period end date for data access';
COMMENT ON COLUMN profiles.account_status IS 'Account status: active, suspended, or deactivated';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
