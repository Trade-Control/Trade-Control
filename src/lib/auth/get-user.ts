import { createClient } from '@/lib/supabase/server'
import { UserPermissions } from './permissions'

export async function getCurrentUser() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return null
  }
  
  // Get user profile with organization and subscription info
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`
      *,
      organization:organizations(
        id,
        name,
        onboarding_completed
      ),
      subscription:subscriptions!inner(
        tier,
        status
      )
    `)
    .eq('id', user.id)
    .single()
  
  if (profileError || !profile) {
    return null
  }
  
  return {
    id: user.id,
    email: user.email!,
    firstName: profile.first_name,
    lastName: profile.last_name,
    role: profile.role,
    organizationId: profile.organization_id,
    assignedJobIds: profile.assigned_job_ids || [],
    organization: profile.organization as any,
    subscription: profile.subscription as any,
  }
}

export async function getUserPermissions(): Promise<UserPermissions | null> {
  const user = await getCurrentUser()
  
  if (!user || !user.organizationId) {
    return null
  }
  
  return {
    role: user.role as any,
    organizationId: user.organizationId,
    subscriptionTier: user.subscription?.[0]?.tier || 'operations',
    assignedJobIds: user.assignedJobIds,
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

export async function requirePermissions(): Promise<UserPermissions> {
  const permissions = await getUserPermissions()
  
  if (!permissions) {
    throw new Error('Unauthorized')
  }
  
  return permissions
}
