-- Add job_prefix to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS job_prefix VARCHAR(10) DEFAULT 'JOB';

-- Add assigned_to to jobs table for job assignment
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to ON jobs(assigned_to);

-- Add comment
COMMENT ON COLUMN organizations.job_prefix IS 'Prefix for auto-generated job numbers';
COMMENT ON COLUMN jobs.assigned_to IS 'User assigned to this job';
