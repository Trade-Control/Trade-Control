export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          abn: string | null
          address: string | null
          city: string | null
          state: string | null
          postcode: string | null
          phone: string | null
          email: string | null
          job_prefix: string | null
          job_number_sequence: number
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          abn?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          postcode?: string | null
          phone?: string | null
          email?: string | null
          job_prefix?: string | null
          job_number_sequence?: number
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          abn?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          postcode?: string | null
          phone?: string | null
          email?: string | null
          job_prefix?: string | null
          job_number_sequence?: number
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          organization_id: string | null
          email: string
          first_name: string
          last_name: string
          role: 'owner' | 'management' | 'field_staff'
          assigned_job_ids: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id?: string | null
          email: string
          first_name: string
          last_name: string
          role?: 'owner' | 'management' | 'field_staff'
          assigned_job_ids?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          email?: string
          first_name?: string
          last_name?: string
          role?: 'owner' | 'management' | 'field_staff'
          assigned_job_ids?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          organization_id: string
          stripe_customer_id: string
          stripe_subscription_id: string
          tier: 'operations' | 'operations_pro_scale' | 'operations_pro_unlimited'
          status: 'trialing' | 'active' | 'past_due' | 'cancelled'
          current_period_start: string
          current_period_end: string
          trial_end: string | null
          cancelled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          stripe_customer_id: string
          stripe_subscription_id: string
          tier?: 'operations' | 'operations_pro_scale' | 'operations_pro_unlimited'
          status?: 'trialing' | 'active' | 'past_due' | 'cancelled'
          current_period_start: string
          current_period_end: string
          trial_end?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          tier?: 'operations' | 'operations_pro_scale' | 'operations_pro_unlimited'
          status?: 'trialing' | 'active' | 'past_due' | 'cancelled'
          current_period_start?: string
          current_period_end?: string
          trial_end?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      licenses: {
        Row: {
          id: string
          organization_id: string
          stripe_subscription_item_id: string | null
          type: 'owner' | 'management' | 'field_staff'
          assigned_to: string | null
          status: 'active' | 'unassigned'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          stripe_subscription_item_id?: string | null
          type: 'owner' | 'management' | 'field_staff'
          assigned_to?: string | null
          status?: 'active' | 'unassigned'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          stripe_subscription_item_id?: string | null
          type?: 'owner' | 'management' | 'field_staff'
          assigned_to?: string | null
          status?: 'active' | 'unassigned'
          created_at?: string
          updated_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          organization_id: string
          job_number: string
          title: string
          description: string | null
          contact_id: string | null
          site_address: string | null
          site_city: string | null
          site_state: string | null
          site_postcode: string | null
          status: 'draft' | 'quoted' | 'approved' | 'in_progress' | 'completed' | 'cancelled'
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          job_number: string
          title: string
          description?: string | null
          contact_id?: string | null
          site_address?: string | null
          site_city?: string | null
          site_state?: string | null
          site_postcode?: string | null
          status?: 'draft' | 'quoted' | 'approved' | 'in_progress' | 'completed' | 'cancelled'
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          job_number?: string
          title?: string
          description?: string | null
          contact_id?: string | null
          site_address?: string | null
          site_city?: string | null
          site_state?: string | null
          site_postcode?: string | null
          status?: 'draft' | 'quoted' | 'approved' | 'in_progress' | 'completed' | 'cancelled'
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          organization_id: string
          type: 'customer' | 'supplier'
          name: string
          company: string | null
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          state: string | null
          postcode: string | null
          abn: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          type: 'customer' | 'supplier'
          name: string
          company?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          postcode?: string | null
          abn?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          type?: 'customer' | 'supplier'
          name?: string
          company?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          postcode?: string | null
          abn?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // Additional tables will be added as we build features
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
