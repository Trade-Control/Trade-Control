import { createClient } from '@/lib/supabase/server'
import { getUserPermissions, UserRole, SubscriptionTier } from './permissions'

export async function getCurrentUser() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return null
  }
  
  // Get user profile first (without organization join in case org doesn't exist yet)
  const { data: profile, error: profileError } = await (supabase
    .from('profiles') as any)
    .select('*')
    .eq('id', user.id)
    .single() as any
  
  if (profileError || !profile) {
    console.error('Profile fetch error:', profileError)
    return null
  }

  // If user has organization_id, fetch organization and subscription
  let organization = null
  let subscription = null
  let tier: SubscriptionTier | null = null
  let hasValidSubscription = false

  if (profile.organization_id) {
    const { data: orgData } = await (supabase
      .from('organizations') as any)
      .select(`
        id,
        name,
        onboarding_completed,
        subscription:subscriptions(
          tier,
          status
        )
      `)
      .eq('id', profile.organization_id)
      .single() as any

    if (orgData) {
      organization = orgData
      subscription = orgData.subscription?.[0]
      
      // Check if subscription is valid (active or trialing)
      if (subscription && ['active', 'trialing'].includes(subscription.status)) {
        tier = subscription.tier as SubscriptionTier
        hasValidSubscription = true
      } else if (subscription && subscription.status === 'past_due') {
        // Past due subscriptions get limited access
        tier = subscription.tier as SubscriptionTier
        hasValidSubscription = false
      } else {
        // No valid subscription - default to operations tier with flag
        tier = 'operations'
        hasValidSubscription = false
      }
    } else {
      // Organization exists but couldn't fetch it - default to operations
      tier = 'operations'
      hasValidSubscription = false
    }
  } else {
    // No organization - default to operations tier
    tier = 'operations'
    hasValidSubscription = false
  }

  const permissions = getUserPermissions((profile.role || 'owner') as UserRole, tier!)
  
  return {
    id: user.id,
    email: user.email!,
    firstName: profile.first_name,
    lastName: profile.last_name,
    role: profile.role || 'owner',
    organization_id: profile.organization_id,
    assignedJobIds: (profile.assigned_job_ids || []) as string[],
    organization: organization as any,
    subscription: subscription as any,
    hasValidSubscription,
    permissions,
  }
}
