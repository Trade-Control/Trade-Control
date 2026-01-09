-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  abn TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contacts table (customers/suppliers)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  type TEXT NOT NULL DEFAULT 'customer', -- 'customer' or 'supplier'
  company_name TEXT,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,
  abn TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create job_codes table (standardized job items)
CREATE TABLE job_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  unit TEXT DEFAULT 'each',
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- Create inventory table
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  quantity DECIMAL(10,2) DEFAULT 0,
  unit TEXT DEFAULT 'each',
  unit_cost DECIMAL(10,2),
  location TEXT,
  category TEXT,
  reorder_level DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  job_number TEXT NOT NULL,
  client_id UUID REFERENCES contacts(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft', -- draft, quoted, approved, in_progress, completed, cancelled
  site_address TEXT,
  site_city TEXT,
  site_state TEXT,
  site_postcode TEXT,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, job_number)
);

-- Create quotes table
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  job_id UUID REFERENCES jobs(id) NOT NULL,
  quote_number TEXT NOT NULL,
  quote_date DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  status TEXT DEFAULT 'draft', -- draft, sent, accepted, rejected, expired
  subtotal DECIMAL(10,2) DEFAULT 0,
  gst_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  terms TEXT,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, quote_number)
);

-- Create quote_line_items table
CREATE TABLE quote_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  job_code_id UUID REFERENCES job_codes(id),
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  job_id UUID REFERENCES jobs(id) NOT NULL,
  quote_id UUID REFERENCES quotes(id),
  invoice_number TEXT NOT NULL,
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
  subtotal DECIMAL(10,2) DEFAULT 0,
  gst_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  terms TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, invoice_number)
);

-- Create invoice_line_items table
CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  job_code_id UUID REFERENCES job_codes(id),
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create timesheets table
CREATE TABLE timesheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  job_id UUID REFERENCES jobs(id) NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_on TIMESTAMPTZ,
  clock_off TIMESTAMPTZ,
  hours DECIMAL(5,2),
  description TEXT,
  is_manual BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  job_id UUID REFERENCES jobs(id) NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('job-documents', 'job-documents', false);

-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own organization"
  ON organizations FOR UPDATE
  USING (id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Authenticated users can insert organization (for setup)"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- RLS Policies for contacts
CREATE POLICY "Users can view their org's contacts"
  ON contacts FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert contacts for their org"
  ON contacts FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their org's contacts"
  ON contacts FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their org's contacts"
  ON contacts FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for job_codes
CREATE POLICY "Users can view their org's job codes"
  ON job_codes FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert job codes for their org"
  ON job_codes FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their org's job codes"
  ON job_codes FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their org's job codes"
  ON job_codes FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for inventory
CREATE POLICY "Users can view their org's inventory"
  ON inventory FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert inventory for their org"
  ON inventory FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their org's inventory"
  ON inventory FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their org's inventory"
  ON inventory FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for jobs
CREATE POLICY "Users can view their org's jobs"
  ON jobs FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert jobs for their org"
  ON jobs FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their org's jobs"
  ON jobs FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their org's jobs"
  ON jobs FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for quotes
CREATE POLICY "Users can view their org's quotes"
  ON quotes FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert quotes for their org"
  ON quotes FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their org's quotes"
  ON quotes FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their org's quotes"
  ON quotes FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for quote_line_items
CREATE POLICY "Users can view their org's quote line items"
  ON quote_line_items FOR SELECT
  USING (quote_id IN (SELECT id FROM quotes WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can insert quote line items for their org"
  ON quote_line_items FOR INSERT
  WITH CHECK (quote_id IN (SELECT id FROM quotes WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can update their org's quote line items"
  ON quote_line_items FOR UPDATE
  USING (quote_id IN (SELECT id FROM quotes WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can delete their org's quote line items"
  ON quote_line_items FOR DELETE
  USING (quote_id IN (SELECT id FROM quotes WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

-- RLS Policies for invoices
CREATE POLICY "Users can view their org's invoices"
  ON invoices FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert invoices for their org"
  ON invoices FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their org's invoices"
  ON invoices FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their org's invoices"
  ON invoices FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for invoice_line_items
CREATE POLICY "Users can view their org's invoice line items"
  ON invoice_line_items FOR SELECT
  USING (invoice_id IN (SELECT id FROM invoices WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can insert invoice line items for their org"
  ON invoice_line_items FOR INSERT
  WITH CHECK (invoice_id IN (SELECT id FROM invoices WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can update their org's invoice line items"
  ON invoice_line_items FOR UPDATE
  USING (invoice_id IN (SELECT id FROM invoices WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can delete their org's invoice line items"
  ON invoice_line_items FOR DELETE
  USING (invoice_id IN (SELECT id FROM invoices WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

-- RLS Policies for timesheets
CREATE POLICY "Users can view their org's timesheets"
  ON timesheets FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert timesheets for their org"
  ON timesheets FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their org's timesheets"
  ON timesheets FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their org's timesheets"
  ON timesheets FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for documents
CREATE POLICY "Users can view their org's documents"
  ON documents FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert documents for their org"
  ON documents FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their org's documents"
  ON documents FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Storage policies for job-documents bucket
CREATE POLICY "Users can view their org's job documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'job-documents' AND (storage.foldername(name))[1] IN (SELECT organization_id::text FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can upload documents for their org"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'job-documents' AND (storage.foldername(name))[1] IN (SELECT organization_id::text FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their org's documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'job-documents' AND (storage.foldername(name))[1] IN (SELECT organization_id::text FROM profiles WHERE id = auth.uid()));

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_codes_updated_at BEFORE UPDATE ON job_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timesheets_updated_at BEFORE UPDATE ON timesheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
