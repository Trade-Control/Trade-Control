-- Create job_inventory_allocations table
CREATE TABLE job_inventory_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE NOT NULL,
  quantity_allocated DECIMAL(10,2) NOT NULL,
  notes TEXT,
  allocated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create travel_logs table
CREATE TABLE travel_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  origin_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  distance_km DECIMAL(10,2),
  duration_minutes INTEGER,
  travel_date TIMESTAMPTZ DEFAULT NOW(),
  is_manual BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE job_inventory_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_inventory_allocations
CREATE POLICY "Users can view their org's job inventory allocations"
  ON job_inventory_allocations FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert job inventory allocations for their org"
  ON job_inventory_allocations FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their org's job inventory allocations"
  ON job_inventory_allocations FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their org's job inventory allocations"
  ON job_inventory_allocations FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for travel_logs
CREATE POLICY "Users can view their org's travel logs"
  ON travel_logs FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert travel logs for their org"
  ON travel_logs FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their org's travel logs"
  ON travel_logs FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their org's travel logs"
  ON travel_logs FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_job_inventory_allocations_updated_at BEFORE UPDATE ON job_inventory_allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_travel_logs_updated_at BEFORE UPDATE ON travel_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
