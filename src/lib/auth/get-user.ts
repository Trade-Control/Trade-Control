import { createClient } from '@/lib/supabase/server'
import { getUserPermissions, UserRole, SubscriptionTier } from './permissions'

export async function getCurrentUser() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return null
  }
  
  // Get user profile with organization and subscription info
  const { data: profile, error: profileError } = await (supabase
    .from('profiles') as any)
    .select(`
      *,
      organization:organizations(
        id,
        name,
        onboarding_completed,
        subscription:subscriptions(
          tier,
          status
        )
      )
    `)
    .eq('id', user.id)
    .single() as any
  
  if (profileError || !profile) {
    return null
  }

  const tier = (profile.organization?.subscription?.[0]?.tier || 'operations') as SubscriptionTier
  const permissions = getUserPermissions(profile.role as UserRole, tier)
  
  return {
    id: user.id,
    email: user.email!,
    firstName: profile.first_name,
    lastName: profile.last_name,
    role: profile.role,
    organization_id: profile.organization_id,
    assignedJobIds: (profile.assigned_job_ids || []) as string[],
    organization: profile.organization as any,
    subscription: profile.organization?.subscription?.[0] as any,
    permissions,
  }
}
