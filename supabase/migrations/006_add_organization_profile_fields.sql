-- =====================================================
-- Add comprehensive organization profile fields
-- =====================================================

-- Add new fields to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trading_name TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS gst_registered BOOLEAN DEFAULT true;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#2563eb';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_email TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS job_code_prefix TEXT DEFAULT 'JOB';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS quote_prefix TEXT DEFAULT 'QT';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS invoice_prefix TEXT DEFAULT 'INV';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS payment_details TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_logo_url ON organizations(logo_url);
CREATE INDEX IF NOT EXISTS idx_organizations_billing_email ON organizations(billing_email);

-- Comments for documentation
COMMENT ON COLUMN organizations.trading_name IS 'Trading name (if different from business name)';
COMMENT ON COLUMN organizations.gst_registered IS 'Whether the business is registered for GST';
COMMENT ON COLUMN organizations.logo_url IS 'URL/path to organization logo for invoices and quotes';
COMMENT ON COLUMN organizations.brand_color IS 'Primary brand color in hex format for invoices and quotes';
COMMENT ON COLUMN organizations.website_url IS 'Organization website URL';
COMMENT ON COLUMN organizations.billing_email IS 'Email address for billing and financial communications';
COMMENT ON COLUMN organizations.job_code_prefix IS 'Prefix for auto-generated job codes';
COMMENT ON COLUMN organizations.quote_prefix IS 'Prefix for auto-generated quote numbers';
COMMENT ON COLUMN organizations.invoice_prefix IS 'Prefix for auto-generated invoice numbers';
COMMENT ON COLUMN organizations.payment_details IS 'Payment details (BSB, Account Number, etc.) for invoices';
