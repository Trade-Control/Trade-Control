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
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  organization_id: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
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
  notes: string | null;
  terms: string | null;
  paid_at: string | null;
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
