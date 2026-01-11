-- Add new fields to jobs table (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'priority') THEN
    ALTER TABLE jobs ADD COLUMN priority TEXT DEFAULT 'normal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'service_area') THEN
    ALTER TABLE jobs ADD COLUMN service_area TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'parent_job_id') THEN
    ALTER TABLE jobs ADD COLUMN parent_job_id UUID REFERENCES jobs(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'completion_status') THEN
    ALTER TABLE jobs ADD COLUMN completion_status TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'completed_at') THEN
    ALTER TABLE jobs ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'completed_by') THEN
    ALTER TABLE jobs ADD COLUMN completed_by UUID REFERENCES profiles(id);
  END IF;
END $$;

-- Add address fields to contacts for auto-population
-- (already exists in schema, but ensuring they're indexed)
CREATE INDEX IF NOT EXISTS idx_contacts_address ON contacts(address, city, state, postcode) WHERE type = 'customer';

-- Create staff_assignments table for job scheduling (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS staff_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  job_id UUID REFERENCES jobs(id) NOT NULL,
  assigned_to UUID REFERENCES profiles(id) NOT NULL,
  assigned_by UUID REFERENCES profiles(id) NOT NULL,
  role TEXT, -- 'lead', 'technician', 'helper', etc.
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create staff_calendar table for time off and availability (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS staff_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  staff_id UUID REFERENCES profiles(id) NOT NULL,
  event_type TEXT NOT NULL, -- 'time_off', 'sick_leave', 'unavailable', 'available'
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT false,
  title TEXT,
  description TEXT,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add service_area to profiles for geographic assignment (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'service_areas') THEN
    ALTER TABLE profiles ADD COLUMN service_areas TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'staff';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'can_view_calendar') THEN
    ALTER TABLE profiles ADD COLUMN can_view_calendar BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'can_manage_staff') THEN
    ALTER TABLE profiles ADD COLUMN can_manage_staff BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create audit_logs table for comprehensive audit trail (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'view', 'approve', 'reject', etc.
  resource_type TEXT NOT NULL, -- 'job', 'quote', 'invoice', 'timesheet', 'document', etc.
  resource_id UUID,
  job_id UUID REFERENCES jobs(id), -- For job-specific audit trails
  description TEXT NOT NULL,
  metadata JSONB, -- Store additional context (old values, new values, etc.)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit logs (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_job ON audit_logs(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id, created_at DESC);

-- Create indexes for staff assignments (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_staff_assignments_job ON staff_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_staff ON staff_assignments(assigned_to, scheduled_start, scheduled_end);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_dates ON staff_assignments(scheduled_start, scheduled_end);

-- Create indexes for staff calendar (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_staff_calendar_staff ON staff_calendar(staff_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_staff_calendar_dates ON staff_calendar(start_date, end_date);

-- Enable RLS on new tables
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_assignments (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their org's staff assignments" ON staff_assignments;
CREATE POLICY "Users can view their org's staff assignments"
  ON staff_assignments FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Managers can insert staff assignments" ON staff_assignments;
CREATE POLICY "Managers can insert staff assignments"
  ON staff_assignments FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (
      auth.uid() IN (SELECT id FROM profiles WHERE organization_id = staff_assignments.organization_id AND (role IN ('owner', 'manager') OR can_manage_staff = true))
    )
  );

DROP POLICY IF EXISTS "Managers can update staff assignments" ON staff_assignments;
CREATE POLICY "Managers can update staff assignments"
  ON staff_assignments FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (
      auth.uid() IN (SELECT id FROM profiles WHERE organization_id = staff_assignments.organization_id AND (role IN ('owner', 'manager') OR can_manage_staff = true))
      OR assigned_to = auth.uid() -- Staff can update their own assignments
    )
  );

DROP POLICY IF EXISTS "Managers can delete staff assignments" ON staff_assignments;
CREATE POLICY "Managers can delete staff assignments"
  ON staff_assignments FOR DELETE
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND auth.uid() IN (SELECT id FROM profiles WHERE organization_id = staff_assignments.organization_id AND (role IN ('owner', 'manager') OR can_manage_staff = true))
  );

-- RLS Policies for staff_calendar (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their org's staff calendar" ON staff_calendar;
CREATE POLICY "Users can view their org's staff calendar"
  ON staff_calendar FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (
      auth.uid() IN (SELECT id FROM profiles WHERE organization_id = staff_calendar.organization_id AND (role IN ('owner', 'manager') OR can_view_calendar = true))
      OR staff_id = auth.uid() -- Staff can always view their own calendar
    )
  );

DROP POLICY IF EXISTS "Staff can insert their own calendar entries" ON staff_calendar;
CREATE POLICY "Staff can insert their own calendar entries"
  ON staff_calendar FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (staff_id = auth.uid() OR auth.uid() IN (SELECT id FROM profiles WHERE organization_id = staff_calendar.organization_id AND (role IN ('owner', 'manager') OR can_manage_staff = true)))
  );

DROP POLICY IF EXISTS "Staff can update their own calendar entries" ON staff_calendar;
CREATE POLICY "Staff can update their own calendar entries"
  ON staff_calendar FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (staff_id = auth.uid() OR auth.uid() IN (SELECT id FROM profiles WHERE organization_id = staff_calendar.organization_id AND (role IN ('owner', 'manager') OR can_manage_staff = true)))
  );

DROP POLICY IF EXISTS "Staff can delete their own calendar entries" ON staff_calendar;
CREATE POLICY "Staff can delete their own calendar entries"
  ON staff_calendar FOR DELETE
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (created_by = auth.uid() OR auth.uid() IN (SELECT id FROM profiles WHERE organization_id = staff_calendar.organization_id AND (role IN ('owner', 'manager') OR can_manage_staff = true)))
  );

-- RLS Policies for audit_logs (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their org's audit logs" ON audit_logs;
CREATE POLICY "Users can view their org's audit logs"
  ON audit_logs FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Only owners can view all audit logs" ON audit_logs;
CREATE POLICY "Only owners can view all audit logs"
  ON audit_logs FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Create function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_organization_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_job_id UUID,
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_logs (
    organization_id,
    user_id,
    action,
    resource_type,
    resource_id,
    job_id,
    description,
    metadata
  ) VALUES (
    p_organization_id,
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_job_id,
    p_description,
    p_metadata
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic audit logging on jobs
CREATE OR REPLACE FUNCTION audit_job_changes()
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
    v_description := 'Job created: ' || NEW.title;
    v_metadata := jsonb_build_object('job_number', NEW.job_number, 'status', NEW.status);
    
    PERFORM log_audit_event(
      NEW.organization_id,
      v_user_id,
      v_action,
      'job',
      NEW.id,
      NEW.id,
      v_description,
      v_metadata
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    
    -- Track specific changes
    IF OLD.status != NEW.status THEN
      v_description := 'Job status changed from ' || OLD.status || ' to ' || NEW.status;
      v_metadata := jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status);
    ELSIF OLD.completion_status != NEW.completion_status OR (OLD.completion_status IS NULL AND NEW.completion_status IS NOT NULL) THEN
      v_description := 'Job completion status changed to ' || COALESCE(NEW.completion_status, 'null');
      v_metadata := jsonb_build_object('completion_status', NEW.completion_status, 'completed_at', NEW.completed_at);
    ELSE
      v_description := 'Job updated: ' || NEW.title;
      v_metadata := jsonb_build_object('updated_fields', 'various');
    END IF;
    
    PERFORM log_audit_event(
      NEW.organization_id,
      v_user_id,
      v_action,
      'job',
      NEW.id,
      NEW.id,
      v_description,
      v_metadata
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_description := 'Job deleted: ' || OLD.title;
    v_metadata := jsonb_build_object('job_number', OLD.job_number, 'status', OLD.status);
    
    PERFORM log_audit_event(
      OLD.organization_id,
      v_user_id,
      v_action,
      'job',
      OLD.id,
      OLD.id,
      v_description,
      v_metadata
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for job audit logging (drop and recreate to avoid conflicts)
DROP TRIGGER IF EXISTS trigger_audit_job_changes ON jobs;
CREATE TRIGGER trigger_audit_job_changes
  AFTER INSERT OR UPDATE OR DELETE ON jobs
  FOR EACH ROW EXECUTE FUNCTION audit_job_changes();

-- Add triggers for updated_at on new tables (drop and recreate to avoid conflicts)
DROP TRIGGER IF EXISTS update_staff_assignments_updated_at ON staff_assignments;
CREATE TRIGGER update_staff_assignments_updated_at BEFORE UPDATE ON staff_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_calendar_updated_at ON staff_calendar;
CREATE TRIGGER update_staff_calendar_updated_at BEFORE UPDATE ON staff_calendar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes to improve job queries (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority, status);
CREATE INDEX IF NOT EXISTS idx_jobs_service_area ON jobs(service_area) WHERE service_area IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_parent ON jobs(parent_job_id) WHERE parent_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_completion ON jobs(completion_status, completed_at);

COMMENT ON COLUMN jobs.priority IS 'Job priority level: low, normal, high, urgent';
COMMENT ON COLUMN jobs.service_area IS 'Geographic area or region for the job';
COMMENT ON COLUMN jobs.parent_job_id IS 'Reference to parent job if this is a related/follow-up job';
COMMENT ON COLUMN jobs.completion_status IS 'Detailed completion status: active, completed, completed_invoice_pending, completed_new_job_created';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system activities';
COMMENT ON TABLE staff_assignments IS 'Job assignments and scheduling for staff members';
COMMENT ON TABLE staff_calendar IS 'Staff availability, time off, and calendar events';
