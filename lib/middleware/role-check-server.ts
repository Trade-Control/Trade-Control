/**
 * Role-Based Access Control Utilities (Server-Side)
 * 
 * This module provides server-side helper functions for checking user roles and permissions.
 * For client-side functions, use role-check.ts
 */

import { createClient as createServerClient } from '../supabase/server';
import { UserRole } from '../types/database.types';
import { UserPermissions, hasRole, isOwner, canManage } from './role-check';

/**
 * Get user permissions (server-side)
 */
export async function getUserPermissionsServer(): Promise<UserPermissions | null> {
  const supabase = await createServerClient();
  
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
 * Require specific role or redirect
 * For use in server components
 */
export async function requireRole(...allowedRoles: UserRole[]) {
  const permissions = await getUserPermissionsServer();
  
  if (!permissions || !permissions.role) {
    throw new Error('Unauthorized: No role assigned');
  }
  
  if (!hasRole(permissions.role, ...allowedRoles)) {
    throw new Error('Unauthorized: Insufficient permissions');
  }
  
  return permissions;
}

/**
 * Require active subscription or redirect
 */
export async function requireActiveSubscription() {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized: Not authenticated');
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();
  
  if (!profile?.organization_id) {
    throw new Error('No organization found');
  }
  
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('organization_id', profile.organization_id)
    .single();
  
  if (!subscription) {
    throw new Error('No subscription found');
  }
  
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    throw new Error('Subscription is not active');
  }
  
  return subscription;
}
