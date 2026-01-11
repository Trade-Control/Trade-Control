-- Contractor Onboarding Requests Table
-- Allows organizations to request specific details/documents from contractors

CREATE TABLE IF NOT EXISTS contractor_onboarding_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Contractor info (may not exist in system yet)
  contractor_email VARCHAR(255) NOT NULL,
  contractor_name VARCHAR(255),
  
  -- Secure access token
  access_token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  
  -- Required fields configuration
  required_fields JSONB DEFAULT '{}',
  -- Example: {"abn": true, "insurance_certificate": true, "license_copy": true, "phone": true}
  
  -- Required documents
  required_documents JSONB DEFAULT '[]',
  -- Example: ["insurance_certificate", "license_copy", "induction_certificate"]
  
  -- Custom message for the contractor
  custom_message TEXT,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'expired', 'cancelled')),
  
  -- Response data from contractor
  submitted_data JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ,
  
  -- If contractor already exists or is created
  contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contractor Onboarding Documents Table
CREATE TABLE IF NOT EXISTS contractor_onboarding_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  onboarding_request_id UUID NOT NULL REFERENCES contractor_onboarding_requests(id) ON DELETE CASCADE,
  
  document_type VARCHAR(100) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contractor_onboarding_org ON contractor_onboarding_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_contractor_onboarding_token ON contractor_onboarding_requests(access_token);
CREATE INDEX IF NOT EXISTS idx_contractor_onboarding_email ON contractor_onboarding_requests(contractor_email);
CREATE INDEX IF NOT EXISTS idx_contractor_onboarding_status ON contractor_onboarding_requests(status);

-- RLS Policies
ALTER TABLE contractor_onboarding_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_onboarding_documents ENABLE ROW LEVEL SECURITY;

-- Organization members can manage their onboarding requests
CREATE POLICY "org_members_manage_onboarding_requests"
ON contractor_onboarding_requests
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- Documents follow the same policy through the request
CREATE POLICY "org_members_manage_onboarding_documents"
ON contractor_onboarding_documents
FOR ALL
USING (
  onboarding_request_id IN (
    SELECT id FROM contractor_onboarding_requests 
    WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Public access for contractors via token (for submissions)
CREATE POLICY "contractors_submit_via_token"
ON contractor_onboarding_requests
FOR SELECT
USING (
  access_token IS NOT NULL 
  AND token_expires_at > NOW()
  AND status NOT IN ('cancelled', 'expired')
);

CREATE POLICY "contractors_update_via_token"
ON contractor_onboarding_requests
FOR UPDATE
USING (
  access_token IS NOT NULL 
  AND token_expires_at > NOW()
  AND status NOT IN ('cancelled', 'expired')
);

-- Storage bucket for onboarding documents
-- Note: Run this in Supabase dashboard or via API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('contractor-onboarding', 'contractor-onboarding', false);

COMMENT ON TABLE contractor_onboarding_requests IS 'Stores contractor onboarding requests with configurable required fields and documents';
COMMENT ON TABLE contractor_onboarding_documents IS 'Stores documents uploaded by contractors during onboarding';
