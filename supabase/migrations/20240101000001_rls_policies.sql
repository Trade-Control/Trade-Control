-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_submission_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to check if user has role
CREATE OR REPLACE FUNCTION user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT role = required_role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to check if user is owner or management
CREATE OR REPLACE FUNCTION user_is_owner_or_management()
RETURNS BOOLEAN AS $$
  SELECT role IN ('owner', 'management') FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to check if job is assigned to field staff user
CREATE OR REPLACE FUNCTION job_is_assigned_to_user(job_id UUID)
RETURNS BOOLEAN AS $$
  SELECT job_id = ANY(assigned_job_ids) FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Organizations policies
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id = get_user_organization_id());

CREATE POLICY "Owners can update their organization"
  ON organizations FOR UPDATE
  USING (id = get_user_organization_id() AND user_has_role('owner'))
  WITH CHECK (id = get_user_organization_id() AND user_has_role('owner'));

-- Profiles policies
CREATE POLICY "Users can view profiles in their organization"
  ON profiles FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Owners can manage all profiles in organization"
  ON profiles FOR ALL
  USING (organization_id = get_user_organization_id() AND user_has_role('owner'))
  WITH CHECK (organization_id = get_user_organization_id() AND user_has_role('owner'));

-- Subscriptions policies
CREATE POLICY "Users can view their organization subscription"
  ON subscriptions FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Owners can manage subscription"
  ON subscriptions FOR ALL
  USING (organization_id = get_user_organization_id() AND user_has_role('owner'))
  WITH CHECK (organization_id = get_user_organization_id() AND user_has_role('owner'));

-- Licenses policies
CREATE POLICY "Users can view licenses in their organization"
  ON licenses FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Owners can manage licenses"
  ON licenses FOR ALL
  USING (organization_id = get_user_organization_id() AND user_has_role('owner'))
  WITH CHECK (organization_id = get_user_organization_id() AND user_has_role('owner'));

-- Contacts policies
CREATE POLICY "Users can view contacts in their organization"
  ON contacts FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Owners and management can manage contacts"
  ON contacts FOR ALL
  USING (organization_id = get_user_organization_id() AND user_is_owner_or_management())
  WITH CHECK (organization_id = get_user_organization_id() AND user_is_owner_or_management());

-- Jobs policies
CREATE POLICY "Owners and management can view all jobs"
  ON jobs FOR SELECT
  USING (organization_id = get_user_organization_id() AND user_is_owner_or_management());

CREATE POLICY "Field staff can view assigned jobs"
  ON jobs FOR SELECT
  USING (organization_id = get_user_organization_id() AND job_is_assigned_to_user(id));

CREATE POLICY "Owners and management can manage jobs"
  ON jobs FOR ALL
  USING (organization_id = get_user_organization_id() AND user_is_owner_or_management())
  WITH CHECK (organization_id = get_user_organization_id() AND user_is_owner_or_management());

CREATE POLICY "Field staff can update assigned job status"
  ON jobs FOR UPDATE
  USING (organization_id = get_user_organization_id() AND job_is_assigned_to_user(id))
  WITH CHECK (organization_id = get_user_organization_id() AND job_is_assigned_to_user(id));

-- Job codes policies
CREATE POLICY "Users can view job codes in their organization"
  ON job_codes FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Owners and management can manage job codes"
  ON job_codes FOR ALL
  USING (organization_id = get_user_organization_id() AND user_is_owner_or_management())
  WITH CHECK (organization_id = get_user_organization_id() AND user_is_owner_or_management());

-- Quotes policies
CREATE POLICY "Owners and management can view quotes"
  ON quotes FOR SELECT
  USING (organization_id = get_user_organization_id() AND user_is_owner_or_management());

CREATE POLICY "Owners and management can manage quotes"
  ON quotes FOR ALL
  USING (organization_id = get_user_organization_id() AND user_is_owner_or_management())
  WITH CHECK (organization_id = get_user_organization_id() AND user_is_owner_or_management());

-- Quote line items policies (inherit from quote)
CREATE POLICY "Users can view quote line items through quote"
  ON quote_line_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_line_items.quote_id 
    AND quotes.organization_id = get_user_organization_id()
    AND user_is_owner_or_management()
  ));

CREATE POLICY "Owners and management can manage quote line items"
  ON quote_line_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_line_items.quote_id 
    AND quotes.organization_id = get_user_organization_id()
    AND user_is_owner_or_management()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_line_items.quote_id 
    AND quotes.organization_id = get_user_organization_id()
    AND user_is_owner_or_management()
  ));

-- Invoices policies
CREATE POLICY "Owners and management can view invoices"
  ON invoices FOR SELECT
  USING (organization_id = get_user_organization_id() AND user_is_owner_or_management());

CREATE POLICY "Owners and management can manage invoices"
  ON invoices FOR ALL
  USING (organization_id = get_user_organization_id() AND user_is_owner_or_management())
  WITH CHECK (organization_id = get_user_organization_id() AND user_is_owner_or_management());

-- Invoice line items policies (inherit from invoice)
CREATE POLICY "Users can view invoice line items through invoice"
  ON invoice_line_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM invoices WHERE invoices.id = invoice_line_items.invoice_id 
    AND invoices.organization_id = get_user_organization_id()
    AND user_is_owner_or_management()
  ));

CREATE POLICY "Owners and management can manage invoice line items"
  ON invoice_line_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM invoices WHERE invoices.id = invoice_line_items.invoice_id 
    AND invoices.organization_id = get_user_organization_id()
    AND user_is_owner_or_management()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices WHERE invoices.id = invoice_line_items.invoice_id 
    AND invoices.organization_id = get_user_organization_id()
    AND user_is_owner_or_management()
  ));

-- Timesheets policies
CREATE POLICY "Users can view timesheets in their organization"
  ON timesheets FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert their own timesheets for assigned jobs"
  ON timesheets FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization_id() 
    AND user_id = auth.uid()
    AND (user_is_owner_or_management() OR job_is_assigned_to_user(job_id))
  );

CREATE POLICY "Users can update their own timesheets"
  ON timesheets FOR UPDATE
  USING (organization_id = get_user_organization_id() AND user_id = auth.uid())
  WITH CHECK (organization_id = get_user_organization_id() AND user_id = auth.uid());

CREATE POLICY "Owners and management can manage all timesheets"
  ON timesheets FOR ALL
  USING (organization_id = get_user_organization_id() AND user_is_owner_or_management())
  WITH CHECK (organization_id = get_user_organization_id() AND user_is_owner_or_management());

-- Documents policies
CREATE POLICY "Users can view documents for their jobs"
  ON documents FOR SELECT
  USING (
    organization_id = get_user_organization_id() 
    AND (user_is_owner_or_management() OR job_is_assigned_to_user(job_id))
  );

CREATE POLICY "Users can upload documents for assigned jobs"
  ON documents FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND (user_is_owner_or_management() OR job_is_assigned_to_user(job_id))
  );

CREATE POLICY "Owners and management can delete documents"
  ON documents FOR DELETE
  USING (organization_id = get_user_organization_id() AND user_is_owner_or_management());

-- Inventory items policies
CREATE POLICY "Users can view inventory in their organization"
  ON inventory_items FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Owners and management can manage inventory"
  ON inventory_items FOR ALL
  USING (organization_id = get_user_organization_id() AND user_is_owner_or_management())
  WITH CHECK (organization_id = get_user_organization_id() AND user_is_owner_or_management());

-- Inventory allocations policies
CREATE POLICY "Users can view inventory allocations"
  ON inventory_allocations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM inventory_items WHERE inventory_items.id = inventory_allocations.inventory_item_id
    AND inventory_items.organization_id = get_user_organization_id()
  ));

CREATE POLICY "Owners and management can manage inventory allocations"
  ON inventory_allocations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM inventory_items WHERE inventory_items.id = inventory_allocations.inventory_item_id
    AND inventory_items.organization_id = get_user_organization_id()
    AND user_is_owner_or_management()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM inventory_items WHERE inventory_items.id = inventory_allocations.inventory_item_id
    AND inventory_items.organization_id = get_user_organization_id()
    AND user_is_owner_or_management()
  ));

-- Travel logs policies
CREATE POLICY "Users can view travel logs in their organization"
  ON travel_logs FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert their own travel logs"
  ON travel_logs FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own travel logs"
  ON travel_logs FOR UPDATE
  USING (organization_id = get_user_organization_id() AND user_id = auth.uid())
  WITH CHECK (organization_id = get_user_organization_id() AND user_id = auth.uid());

CREATE POLICY "Owners and management can manage all travel logs"
  ON travel_logs FOR ALL
  USING (organization_id = get_user_organization_id() AND user_is_owner_or_management())
  WITH CHECK (organization_id = get_user_organization_id() AND user_is_owner_or_management());

-- Contractors policies (Operations Pro only - enforced at application level)
CREATE POLICY "Users can view contractors in their organization"
  ON contractors FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Owners and management can manage contractors"
  ON contractors FOR ALL
  USING (organization_id = get_user_organization_id() AND user_is_owner_or_management())
  WITH CHECK (organization_id = get_user_organization_id() AND user_is_owner_or_management());

-- Contractor job assignments policies
CREATE POLICY "Users can view contractor assignments"
  ON contractor_job_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM contractors WHERE contractors.id = contractor_job_assignments.contractor_id
    AND contractors.organization_id = get_user_organization_id()
  ));

CREATE POLICY "Owners and management can manage contractor assignments"
  ON contractor_job_assignments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM contractors WHERE contractors.id = contractor_job_assignments.contractor_id
    AND contractors.organization_id = get_user_organization_id()
    AND user_is_owner_or_management()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM contractors WHERE contractors.id = contractor_job_assignments.contractor_id
    AND contractors.organization_id = get_user_organization_id()
    AND user_is_owner_or_management()
  ));

-- Contractor submissions policies
CREATE POLICY "Users can view contractor submissions"
  ON contractor_submissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM contractor_job_assignments cja
    JOIN contractors c ON c.id = cja.contractor_id
    WHERE cja.id = contractor_submissions.contractor_job_assignment_id
    AND c.organization_id = get_user_organization_id()
  ));

CREATE POLICY "Owners and management can manage contractor submissions"
  ON contractor_submissions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM contractor_job_assignments cja
    JOIN contractors c ON c.id = cja.contractor_id
    WHERE cja.id = contractor_submissions.contractor_job_assignment_id
    AND c.organization_id = get_user_organization_id()
    AND user_is_owner_or_management()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM contractor_job_assignments cja
    JOIN contractors c ON c.id = cja.contractor_id
    WHERE cja.id = contractor_submissions.contractor_job_assignment_id
    AND c.organization_id = get_user_organization_id()
    AND user_is_owner_or_management()
  ));

-- Contractor submission photos policies
CREATE POLICY "Users can view contractor submission photos"
  ON contractor_submission_photos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM contractor_submissions cs
    JOIN contractor_job_assignments cja ON cja.id = cs.contractor_job_assignment_id
    JOIN contractors c ON c.id = cja.contractor_id
    WHERE cs.id = contractor_submission_photos.submission_id
    AND c.organization_id = get_user_organization_id()
  ));

-- Email communications policies
CREATE POLICY "Users can view email communications"
  ON email_communications FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "System can insert email communications"
  ON email_communications FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- Audit trail policies
CREATE POLICY "Owners can view audit trail"
  ON audit_trail FOR SELECT
  USING (organization_id = get_user_organization_id() AND user_has_role('owner'));

CREATE POLICY "System can insert audit trail"
  ON audit_trail FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());
