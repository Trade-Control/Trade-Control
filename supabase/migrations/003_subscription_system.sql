-- =====================================================
-- 003 SUBSCRIPTION SYSTEM MIGRATION
-- =====================================================
-- This migration adds subscription management, role-based access control,
-- contractor management, and email communication tracking.

-- =====================================================
-- 1. CREATE NEW TABLES (IF NOT EXISTS)
-- =====================================================

-- Subscriptions table - Track organization subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('operations', 'operations_pro')),
  operations_pro_level TEXT CHECK (operations_pro_level IN ('scale', 'unlimited')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  base_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Licenses table - Individual user licenses
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  license_type TEXT NOT NULL CHECK (license_type IN ('owner', 'management', 'field_staff')),
  stripe_subscription_item_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  monthly_cost DECIMAL(10,2) NOT NULL,
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contractors table - External contractors
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  contractor_name TEXT NOT NULL,
  company_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  mobile TEXT,
  abn TEXT,
  insurance_expiry DATE,
  license_number TEXT,
  license_expiry DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'flagged', 'blocked')),
  compliance_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contractor job assignments table
CREATE TABLE IF NOT EXISTS contractor_job_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES profiles(id) NOT NULL,
  access_token TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contractor submissions table
CREATE TABLE IF NOT EXISTS contractor_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES contractor_job_assignments(id) ON DELETE CASCADE NOT NULL,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('progress', 'completion', 'invoice')),
  notes TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  invoice_amount DECIMAL(10,2),
  invoice_file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'accepted', 'needs_changes', 'rejected')),
  review_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email communications table
CREATE TABLE IF NOT EXISTS email_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('job_assignment', 'quote', 'invoice', 'follow_up', 'reminder', 'notification')),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  resend_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity feed table
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('email_sent', 'contractor_submission', 'status_change', 'quote_sent', 'invoice_sent', 'contractor_assigned', 'field_staff_assigned', 'document_uploaded', 'note_added')),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'contractor', 'system')),
  actor_id UUID,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. MODIFY EXISTING TABLES
-- =====================================================

-- Add columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('owner', 'management', 'field_staff'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS license_id UUID REFERENCES licenses(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assigned_job_ids JSONB DEFAULT '[]'::jsonb;

-- Add columns to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}'::jsonb;

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- Licenses indexes
CREATE INDEX IF NOT EXISTS idx_licenses_organization_id ON licenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_licenses_profile_id ON licenses(profile_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_type ON licenses(license_type);

-- Contractors indexes
CREATE INDEX IF NOT EXISTS idx_contractors_organization_id ON contractors(organization_id);
CREATE INDEX IF NOT EXISTS idx_contractors_status ON contractors(status);
CREATE INDEX IF NOT EXISTS idx_contractors_email ON contractors(email);
CREATE INDEX IF NOT EXISTS idx_contractors_insurance_expiry ON contractors(insurance_expiry);
CREATE INDEX IF NOT EXISTS idx_contractors_license_expiry ON contractors(license_expiry);

-- Contractor job assignments indexes
CREATE INDEX IF NOT EXISTS idx_contractor_assignments_organization_id ON contractor_job_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_contractor_assignments_job_id ON contractor_job_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_contractor_assignments_contractor_id ON contractor_job_assignments(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_assignments_token ON contractor_job_assignments(access_token);
CREATE INDEX IF NOT EXISTS idx_contractor_assignments_status ON contractor_job_assignments(status);

-- Contractor submissions indexes
CREATE INDEX IF NOT EXISTS idx_contractor_submissions_assignment_id ON contractor_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_contractor_submissions_status ON contractor_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contractor_submissions_submitted_at ON contractor_submissions(submitted_at);

-- Email communications indexes
CREATE INDEX IF NOT EXISTS idx_email_communications_organization_id ON email_communications(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_communications_job_id ON email_communications(job_id);
CREATE INDEX IF NOT EXISTS idx_email_communications_contractor_id ON email_communications(contractor_id);
CREATE INDEX IF NOT EXISTS idx_email_communications_sent_at ON email_communications(sent_at);

-- Activity feed indexes
CREATE INDEX IF NOT EXISTS idx_activity_feed_organization_id ON activity_feed(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_job_id ON activity_feed(job_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_feed_activity_type ON activity_feed(activity_type);

-- Profiles indexes for new columns
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_license_id ON profiles(license_id);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREATE RLS POLICIES (DROP IF EXISTS FIRST)
-- =====================================================

-- Subscriptions policies
DROP POLICY IF EXISTS "Users can view their organization's subscription" ON subscriptions;
CREATE POLICY "Users can view their organization's subscription"
  ON subscriptions FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Owners can update their organization's subscription" ON subscriptions;
CREATE POLICY "Owners can update their organization's subscription"
  ON subscriptions FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS "System can insert subscriptions" ON subscriptions;
CREATE POLICY "System can insert subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (true);

-- Licenses policies
DROP POLICY IF EXISTS "Users can view their organization's licenses" ON licenses;
CREATE POLICY "Users can view their organization's licenses"
  ON licenses FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Owners can manage licenses" ON licenses;
CREATE POLICY "Owners can manage licenses"
  ON licenses FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Contractors policies
DROP POLICY IF EXISTS "Users can view their organization's contractors" ON contractors;
CREATE POLICY "Users can view their organization's contractors"
  ON contractors FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND organization_id IN (
      SELECT organization_id FROM subscriptions WHERE tier = 'operations_pro'
    )
  );

DROP POLICY IF EXISTS "Management and owners can manage contractors" ON contractors;
CREATE POLICY "Management and owners can manage contractors"
  ON contractors FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'management')
    )
    AND organization_id IN (
      SELECT organization_id FROM subscriptions WHERE tier = 'operations_pro'
    )
  );

-- Contractor job assignments policies
DROP POLICY IF EXISTS "Users can view their organization's contractor assignments" ON contractor_job_assignments;
CREATE POLICY "Users can view their organization's contractor assignments"
  ON contractor_job_assignments FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Management and owners can manage contractor assignments" ON contractor_job_assignments;
CREATE POLICY "Management and owners can manage contractor assignments"
  ON contractor_job_assignments FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'management')
    )
  );

-- Public access policy for contractors using tokens
DROP POLICY IF EXISTS "Contractors can view their assignments via token" ON contractor_job_assignments;
CREATE POLICY "Contractors can view their assignments via token"
  ON contractor_job_assignments FOR SELECT
  TO anon
  USING (
    token_expires_at > NOW()
  );

-- Contractor submissions policies
DROP POLICY IF EXISTS "Users can view submissions for their organization's assignments" ON contractor_submissions;
CREATE POLICY "Users can view submissions for their organization's assignments"
  ON contractor_submissions FOR SELECT
  USING (
    assignment_id IN (
      SELECT id FROM contractor_job_assignments 
      WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Management and owners can review submissions" ON contractor_submissions;
CREATE POLICY "Management and owners can review submissions"
  ON contractor_submissions FOR UPDATE
  USING (
    assignment_id IN (
      SELECT id FROM contractor_job_assignments 
      WHERE organization_id IN (
        SELECT organization_id FROM profiles 
        WHERE id = auth.uid() AND role IN ('owner', 'management')
      )
    )
  );

-- Public access for contractors to submit
DROP POLICY IF EXISTS "Contractors can create submissions via valid token" ON contractor_submissions;
CREATE POLICY "Contractors can create submissions via valid token"
  ON contractor_submissions FOR INSERT
  TO anon
  WITH CHECK (
    assignment_id IN (
      SELECT id FROM contractor_job_assignments 
      WHERE token_expires_at > NOW()
    )
  );

-- Email communications policies
DROP POLICY IF EXISTS "Users can view their organization's email communications" ON email_communications;
CREATE POLICY "Users can view their organization's email communications"
  ON email_communications FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "System can insert email communications" ON email_communications;
CREATE POLICY "System can insert email communications"
  ON email_communications FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Activity feed policies
DROP POLICY IF EXISTS "Users can view their organization's activity feed" ON activity_feed;
CREATE POLICY "Users can view their organization's activity feed"
  ON activity_feed FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "System can insert activity feed entries" ON activity_feed;
CREATE POLICY "System can insert activity feed entries"
  ON activity_feed FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- =====================================================
-- 6. UPDATE EXISTING RLS POLICIES FOR ROLE-BASED ACCESS
-- =====================================================

-- Drop and recreate jobs policies with role-based access
DROP POLICY IF EXISTS "Users can view their org's jobs" ON jobs;
CREATE POLICY "Users can view their org's jobs"
  ON jobs FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (
      -- Owners and management see all jobs
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'management')
      OR
      -- Field staff only see assigned jobs
      (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'field_staff'
        AND id::text = ANY(SELECT jsonb_array_elements_text(assigned_job_ids) FROM profiles WHERE id = auth.uid())
      )
    )
  );

-- Field staff cannot insert or delete jobs
DROP POLICY IF EXISTS "Users can insert jobs for their org" ON jobs;
DROP POLICY IF EXISTS "Owners and management can insert jobs" ON jobs;
CREATE POLICY "Owners and management can insert jobs"
  ON jobs FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'management')
    )
  );

DROP POLICY IF EXISTS "Users can delete their org's jobs" ON jobs;
DROP POLICY IF EXISTS "Owners and management can delete jobs" ON jobs;
CREATE POLICY "Owners and management can delete jobs"
  ON jobs FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'management')
    )
  );

-- Field staff can only update specific fields
DROP POLICY IF EXISTS "Users can update their org's jobs" ON jobs;
DROP POLICY IF EXISTS "Owners and management can update jobs" ON jobs;
CREATE POLICY "Owners and management can update jobs"
  ON jobs FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'management')
    )
  );

DROP POLICY IF EXISTS "Field staff can update assigned jobs status and notes" ON jobs;
CREATE POLICY "Field staff can update assigned jobs status and notes"
  ON jobs FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'field_staff'
    AND id::text = ANY(SELECT jsonb_array_elements_text(assigned_job_ids) FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    -- Only allow updating status and notes columns
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Quotes and invoices - field staff should not access
DROP POLICY IF EXISTS "Users can view their org's quotes" ON quotes;
DROP POLICY IF EXISTS "Owners and management can view quotes" ON quotes;
CREATE POLICY "Owners and management can view quotes"
  ON quotes FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'management')
    )
  );

DROP POLICY IF EXISTS "Users can insert quotes for their org" ON quotes;
DROP POLICY IF EXISTS "Owners and management can insert quotes" ON quotes;
CREATE POLICY "Owners and management can insert quotes"
  ON quotes FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'management')
    )
  );

DROP POLICY IF EXISTS "Users can update their org's quotes" ON quotes;
DROP POLICY IF EXISTS "Owners and management can update quotes" ON quotes;
CREATE POLICY "Owners and management can update quotes"
  ON quotes FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'management')
    )
  );

DROP POLICY IF EXISTS "Users can delete their org's quotes" ON quotes;
DROP POLICY IF EXISTS "Owners and management can delete quotes" ON quotes;
CREATE POLICY "Owners and management can delete quotes"
  ON quotes FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'management')
    )
  );

-- Similar restrictions for invoices
DROP POLICY IF EXISTS "Users can view their org's invoices" ON invoices;
DROP POLICY IF EXISTS "Owners and management can view invoices" ON invoices;
CREATE POLICY "Owners and management can view invoices"
  ON invoices FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'management')
    )
  );

DROP POLICY IF EXISTS "Users can insert invoices for their org" ON invoices;
DROP POLICY IF EXISTS "Owners and management can insert invoices" ON invoices;
CREATE POLICY "Owners and management can insert invoices"
  ON invoices FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'management')
    )
  );

DROP POLICY IF EXISTS "Users can update their org's invoices" ON invoices;
DROP POLICY IF EXISTS "Owners and management can update invoices" ON invoices;
CREATE POLICY "Owners and management can update invoices"
  ON invoices FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'management')
    )
  );

DROP POLICY IF EXISTS "Users can delete their org's invoices" ON invoices;
DROP POLICY IF EXISTS "Owners and management can delete invoices" ON invoices;
CREATE POLICY "Owners and management can delete invoices"
  ON invoices FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'management')
    )
  );

-- =====================================================
-- 7. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_licenses_updated_at ON licenses;
CREATE TRIGGER update_licenses_updated_at BEFORE UPDATE ON licenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contractors_updated_at ON contractors;
CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON contractors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contractor_job_assignments_updated_at ON contractor_job_assignments;
CREATE TRIGGER update_contractor_job_assignments_updated_at BEFORE UPDATE ON contractor_job_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to check if organization has Operations Pro
CREATE OR REPLACE FUNCTION has_operations_pro(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE organization_id = org_id 
    AND tier = 'operations_pro' 
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check contractor compliance
CREATE OR REPLACE FUNCTION is_contractor_compliant(contractor_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  contractor_record RECORD;
BEGIN
  SELECT * INTO contractor_record FROM contractors WHERE id = contractor_id;
  
  IF contractor_record.status = 'blocked' THEN
    RETURN FALSE;
  END IF;
  
  IF contractor_record.insurance_expiry IS NOT NULL AND contractor_record.insurance_expiry < CURRENT_DATE THEN
    RETURN FALSE;
  END IF;
  
  IF contractor_record.license_expiry IS NOT NULL AND contractor_record.license_expiry < CURRENT_DATE THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-flag non-compliant contractors
CREATE OR REPLACE FUNCTION auto_flag_non_compliant_contractors()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE contractors
  SET status = 'flagged'
  WHERE status = 'active'
  AND (
    (insurance_expiry IS NOT NULL AND insurance_expiry < CURRENT_DATE)
    OR (license_expiry IS NOT NULL AND license_expiry < CURRENT_DATE)
  );
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate secure access token
CREATE OR REPLACE FUNCTION generate_access_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. CREATE STORAGE BUCKET FOR CONTRACTOR SUBMISSIONS
-- =====================================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('contractor-submissions', 'contractor-submissions', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for contractor submissions
DROP POLICY IF EXISTS "Users can view their org's contractor submission files" ON storage.objects;
CREATE POLICY "Users can view their org's contractor submission files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'contractor-submissions' 
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can upload contractor submission files" ON storage.objects;
CREATE POLICY "System can upload contractor submission files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'contractor-submissions');

DROP POLICY IF EXISTS "Users can delete their org's contractor submission files" ON storage.objects;
CREATE POLICY "Users can delete their org's contractor submission files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'contractor-submissions' 
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'management')
    )
  );

-- =====================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE subscriptions IS 'Organization subscription plans and billing information';
COMMENT ON TABLE licenses IS 'Individual user licenses for management and field staff';
COMMENT ON TABLE contractors IS 'External contractors with compliance tracking';
COMMENT ON TABLE contractor_job_assignments IS 'Job assignments for contractors with token-based access';
COMMENT ON TABLE contractor_submissions IS 'Work submissions from contractors (photos, notes, invoices)';
COMMENT ON TABLE email_communications IS 'Log of all email communications sent from the system';
COMMENT ON TABLE activity_feed IS 'Unified activity timeline for jobs';

COMMENT ON COLUMN profiles.role IS 'User role: owner (full access), management (job management), field_staff (view assigned jobs only)';
COMMENT ON COLUMN profiles.assigned_job_ids IS 'JSON array of job IDs assigned to field staff';
COMMENT ON COLUMN organizations.onboarding_completed IS 'Whether organization has completed initial onboarding';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
