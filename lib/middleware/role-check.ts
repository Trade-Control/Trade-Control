/**
 * Role-Based Access Control Utilities (Client-Side)
 * 
 * This module provides client-side helper functions for checking user roles and permissions.
 * For server-side functions, use role-check-server.ts
 */

import { createClient } from '../supabase/client';
import { UserRole } from '../types/database.types';

export interface UserPermissions {
  role: UserRole | null;
  canManageLicenses: boolean;
  canManageSubscription: boolean;
  canManageJobs: boolean;
  canManageContractors: boolean;
  canViewQuotes: boolean;
  canViewInvoices: boolean;
  canViewAllJobs: boolean;
  assignedJobIds: string[];
}

/**
 * Check if user has a specific role
 */
export function hasRole(userRole: UserRole | null, ...allowedRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

/**
 * Check if user is owner
 */
export function isOwner(userRole: UserRole | null): boolean {
  return userRole === 'owner';
}

/**
 * Check if user is management or owner
 */
export function canManage(userRole: UserRole | null): boolean {
  return userRole === 'owner' || userRole === 'management';
}

/**
 * Check if user is field staff
 */
export function isFieldStaff(userRole: UserRole | null): boolean {
  return userRole === 'field_staff';
}

/**
 * Get user permissions (client-side)
 */
export async function getUserPermissions(): Promise<UserPermissions | null> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, assigned_job_ids, organization_id')
    .eq('id', user.id)
    .single();
  
  if (!profile) return null;
  
  // Check subscription tier
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('organization_id', profile.organization_id)
    .single();
  
  const role = profile.role as UserRole | null;
  const hasOperationsPro = subscription?.tier === 'operations_pro';
  
  return {
    role,
    canManageLicenses: isOwner(role),
    canManageSubscription: isOwner(role),
    canManageJobs: canManage(role),
    canManageContractors: canManage(role) && hasOperationsPro,
    canViewQuotes: canManage(role),
    canViewInvoices: canManage(role),
    canViewAllJobs: canManage(role),
    assignedJobIds: (profile.assigned_job_ids as string[]) || [],
  };
}

/**
 * Check if user can access a specific job
 */
export async function canAccessJob(jobId: string): Promise<boolean> {
  const permissions = await getUserPermissions();
  if (!permissions) return false;
  
  // Owners and management can access all jobs
  if (permissions.canViewAllJobs) return true;
  
  // Field staff can only access assigned jobs
  if (isFieldStaff(permissions.role)) {
    return permissions.assignedJobIds.includes(jobId);
  }
  
  return false;
}

/**
 * Check if user can edit job details
 */
export async function canEditJob(jobId: string): Promise<boolean> {
  const permissions = await getUserPermissions();
  if (!permissions) return false;
  
  // Only owners and management can edit jobs
  return permissions.canManageJobs;
}

/**
 * Check if user can update job status/notes (field staff limited access)
 */
export async function canUpdateJobProgress(jobId: string): Promise<boolean> {
  const permissions = await getUserPermissions();
  if (!permissions) return false;
  
  // Owners and management can always update
  if (permissions.canManageJobs) return true;
  
  // Field staff can update if job is assigned to them
  if (isFieldStaff(permissions.role)) {
    return permissions.assignedJobIds.includes(jobId);
  }
  
  return false;
}

/**
 * Check if organization has Operations Pro subscription
 */
export async function hasOperationsPro(): Promise<boolean> {
  try {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('hasOperationsPro: No user found');
      return false;
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('hasOperationsPro: Profile error:', profileError);
      return false;
    }
    
    if (!profile?.organization_id) {
      console.log('hasOperationsPro: No organization_id found');
      return false;
    }
    
    // Query subscription with fresh data (Supabase client queries are fresh by default)
    // Using maybeSingle to handle cases where subscription might not exist yet
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('organization_id', profile.organization_id)
      .maybeSingle();
    
    if (subError) {
      console.error('hasOperationsPro: Subscription error:', subError);
      return false;
    }
    
    if (!subscription) {
      console.log('hasOperationsPro: No subscription found');
      return false;
    }
    
    // Allow both 'active' and 'trialing' statuses for Operations Pro access
    const hasProTier = subscription.tier === 'operations_pro';
    const isActiveOrTrialing = subscription.status === 'active' || subscription.status === 'trialing';
    
    console.log('hasOperationsPro check:', {
      tier: subscription.tier,
      status: subscription.status,
      hasProTier,
      isActiveOrTrialing,
      result: hasProTier && isActiveOrTrialing,
    });
    
    return hasProTier && isActiveOrTrialing;
  } catch (error) {
    console.error('hasOperationsPro: Unexpected error:', error);
    return false;
  }
}

/**
 * Check if organization has active subscription
 */
export async function hasActiveSubscription(): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();
  
  if (!profile) return false;
  
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('organization_id', profile.organization_id)
    .single();
  
  return subscription?.status === 'active' || subscription?.status === 'trialing';
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole | null): string {
  if (!role) return 'No Role';
  
  const roleNames: Record<UserRole, string> = {
    owner: 'Owner / License Manager',
    management: 'Management Login',
    field_staff: 'Field Staff',
  };
  
  return roleNames[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    owner: 'Full access to all features, manage licenses and subscriptions',
    management: 'Manage jobs, quotes, invoices, and contractors',
    field_staff: 'View assigned jobs and update completion data',
  };
  
  return descriptions[role];
}

/**
 * Check if user needs onboarding
 */
export async function needsOnboarding(): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();
  
  if (!profile) return true;
  
  // If user has no organization, they need onboarding
  if (!profile.organization_id) return true;
  
  // Check if organization has completed onboarding
  const { data: org } = await supabase
    .from('organizations')
    .select('onboarding_completed, subscription_id')
    .eq('id', profile.organization_id)
    .single();
  
  if (!org) return true;
  
  // Need onboarding if not completed or no subscription
  return !org.onboarding_completed || !org.subscription_id;
}
