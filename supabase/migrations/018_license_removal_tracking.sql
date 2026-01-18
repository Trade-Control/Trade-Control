-- =====================================================
-- 018 LICENSE REMOVAL TRACKING
-- =====================================================
-- This migration adds tracking fields for license removal
-- to support Stripe-managed pro-rata license removal

-- Add removal tracking columns to licenses table
ALTER TABLE licenses 
  ADD COLUMN IF NOT EXISTS scheduled_for_removal BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS removal_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;

-- Create index for efficient queries of licenses scheduled for removal
CREATE INDEX IF NOT EXISTS idx_licenses_scheduled_for_removal 
  ON licenses(scheduled_for_removal) 
  WHERE scheduled_for_removal = true;

-- Create index for removal date queries
CREATE INDEX IF NOT EXISTS idx_licenses_removal_date 
  ON licenses(removal_date) 
  WHERE removal_date IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN licenses.scheduled_for_removal IS 'True when license is scheduled for removal at end of billing period';
COMMENT ON COLUMN licenses.removal_date IS 'Date when license will be removed (end of current billing period)';
COMMENT ON COLUMN licenses.removed_at IS 'Timestamp when license was actually removed/deactivated';
