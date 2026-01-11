export type Organization = {
  id: string;
  name: string;
  abn: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  subscription_id: string | null;
  onboarding_completed: boolean;
  onboarding_data: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  organization_id: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: UserRole | null;
  license_id: string | null;
  assigned_job_ids: string[]; // Array of job IDs for field staff
  account_status: 'active' | 'suspended' | 'deactivated';
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  organization_id: string;
  created_by: string;
  type: 'customer' | 'supplier';
  company_name: string | null;
  contact_name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  abn: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type JobCode = {
  id: string;
  organization_id: string;
  created_by: string;
  code: string;
  description: string;
  unit_price: number;
  unit: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Inventory = {
  id: string;
  organization_id: string;
  created_by: string;
  item_name: string;
  description: string | null;
  sku: string | null;
  quantity: number;
  unit: string;
  unit_cost: number | null;
  location: string | null;
  category: string | null;
  reorder_level: number | null;
  created_at: string;
  updated_at: string;
};

export type Job = {
  id: string;
  organization_id: string;
  created_by: string;
  job_number: string;
  client_id: string | null;
  title: string;
  description: string | null;
  status: 'draft' | 'quoted' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  site_address: string | null;
  site_city: string | null;
  site_state: string | null;
  site_postcode: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Quote = {
  id: string;
  organization_id: string;
  created_by: string;
  job_id: string;
  quote_number: string;
  quote_date: string;
  valid_until: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  notes: string | null;
  terms: string | null;
  accepted_at: string | null;
  deleted_at: string | null;
  last_edited_by: string | null;
  last_edited_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

export type QuoteLineItem = {
  id: string;
  quote_id: string;
  job_code_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
  created_at: string;
};

export type Invoice = {
  id: string;
  organization_id: string;
  created_by: string;
  job_id: string;
  quote_id: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  amount_paid: number;
  deposit_amount: number;
  deposit_paid: boolean;
  deposit_paid_date: string | null;
  notes: string | null;
  terms: string | null;
  paid_at: string | null;
  deleted_at: string | null;
  last_edited_by: string | null;
  last_edited_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

export type InvoiceLineItem = {
  id: string;
  invoice_id: string;
  job_code_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
  created_at: string;
};

export type Timesheet = {
  id: string;
  organization_id: string;
  created_by: string;
  job_id: string;
  entry_date: string;
  clock_on: string | null;
  clock_off: string | null;
  hours: number | null;
  description: string | null;
  is_manual: boolean;
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  organization_id: string;
  created_by: string;
  job_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  description: string | null;
  created_at: string;
};

export type JobInventoryAllocation = {
  id: string;
  organization_id: string;
  created_by: string;
  job_id: string;
  inventory_id: string;
  quantity_allocated: number;
  quantity_used: number;
  quantity_returned: number;
  status: 'allocated' | 'used' | 'returned' | 'cancelled';
  notes: string | null;
  allocated_at: string;
  created_at: string;
  updated_at: string;
};

export type TravelLog = {
  id: string;
  organization_id: string;
  created_by: string;
  job_id: string | null;
  origin_address: string;
  destination_address: string;
  distance_km: number | null;
  duration_minutes: number | null;
  travel_date: string;
  is_manual: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// Subscription System Types
export type SubscriptionTier = 'operations' | 'operations_pro';
export type OperationsProLevel = 'scale' | 'unlimited';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';
export type LicenseType = 'owner' | 'management' | 'field_staff';
export type LicenseStatus = 'active' | 'inactive';
export type ContractorStatus = 'active' | 'flagged' | 'blocked';
export type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type SubmissionType = 'progress' | 'completion' | 'invoice';
export type SubmissionStatus = 'pending_review' | 'accepted' | 'needs_changes' | 'rejected';
export type EmailType = 'job_assignment' | 'quote' | 'invoice' | 'follow_up' | 'reminder' | 'notification';
export type EmailStatus = 'sent' | 'delivered' | 'failed' | 'bounced';
export type ActivityType = 'email_sent' | 'contractor_submission' | 'status_change' | 'quote_sent' | 'invoice_sent' | 'contractor_assigned' | 'field_staff_assigned' | 'document_uploaded' | 'note_added';
export type ActorType = 'user' | 'contractor' | 'system';
export type UserRole = 'owner' | 'management' | 'field_staff';

export type Subscription = {
  id: string;
  organization_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  tier: SubscriptionTier;
  operations_pro_level: OperationsProLevel | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  base_price: number;
  total_price: number;
  trial_ends_at: string | null;
  expired_at: string | null;
  grace_period_ends: string | null;
  read_only_mode: boolean;
  created_at: string;
  updated_at: string;
};

export type License = {
  id: string;
  organization_id: string;
  profile_id: string | null;
  license_type: LicenseType;
  stripe_subscription_item_id: string | null;
  status: LicenseStatus;
  monthly_cost: number;
  assigned_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Contractor = {
  id: string;
  organization_id: string;
  created_by: string;
  contractor_name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  mobile: string | null;
  abn: string | null;
  insurance_expiry: string | null;
  license_number: string | null;
  license_expiry: string | null;
  status: ContractorStatus;
  compliance_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ContractorJobAssignment = {
  id: string;
  organization_id: string;
  job_id: string;
  contractor_id: string;
  assigned_by: string;
  access_token: string;
  token_expires_at: string;
  status: AssignmentStatus;
  created_at: string;
  updated_at: string;
};

export type ContractorSubmission = {
  id: string;
  assignment_id: string;
  submission_type: SubmissionType;
  notes: string | null;
  photos: string[]; // Array of URLs
  invoice_amount: number | null;
  invoice_file_url: string | null;
  status: SubmissionStatus;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string;
  created_at: string;
};

export type EmailCommunication = {
  id: string;
  organization_id: string;
  job_id: string | null;
  contractor_id: string | null;
  email_type: EmailType;
  recipient_email: string;
  subject: string;
  body: string;
  resend_message_id: string | null;
  status: EmailStatus;
  sent_at: string;
  created_at: string;
};

export type ActivityFeed = {
  id: string;
  organization_id: string;
  job_id: string;
  activity_type: ActivityType;
  actor_type: ActorType;
  actor_id: string | null;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
};

// New types for payment tracking
export type InvoicePayment = {
  id: string;
  invoice_id: string;
  organization_id: string;
  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'check' | 'other';
  reference_number: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
};

export type AuditLog = {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  job_id: string | null;
  description: string;
  metadata: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type ReportingSnapshot = {
  id: string;
  organization_id: string;
  snapshot_date: string;
  snapshot_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  data: Record<string, any>;
  created_at: string;
};
