'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function checkUserRedirect() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { redirect: '/login' }
  }

  // Get user profile
  const { data: profile, error: profileError } = await (supabase
    .from('profiles') as any)
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('checkUserRedirect: Profile error:', profileError)
    return { redirect: '/login', error: 'Profile not found' }
  }

  if (!profile?.organization_id) {
    console.log('checkUserRedirect: No organization, redirect to checkout')
    return { redirect: '/auth/checkout' }
  }

  // Check organization onboarding status
  const { data: org, error: orgError } = await (supabase
    .from('organizations') as any)
    .select('onboarding_completed')
    .eq('id', profile.organization_id)
    .single()

  if (orgError) {
    console.error('checkUserRedirect: Organization error:', orgError)
  }

  if (!org?.onboarding_completed) {
    console.log('checkUserRedirect: Onboarding incomplete, redirect to onboarding')
    return { redirect: '/onboarding' }
  }

  // Check subscription
  const { data: subscription, error: subError } = await (supabase
    .from('subscriptions') as any)
    .select('status, tier')
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  if (subError) {
    console.error('checkUserRedirect: Subscription error:', subError)
  }

  console.log('checkUserRedirect: Subscription data:', subscription)

  if (!subscription) {
    console.log('checkUserRedirect: No subscription, redirect to checkout')
    return { redirect: '/auth/checkout' }
  }

  if (subscription.status === 'past_due' || subscription.status === 'cancelled') {
    console.log('checkUserRedirect: Inactive subscription, redirect to expired')
    return { redirect: '/subscription/expired' }
  }

  console.log('checkUserRedirect: All checks passed, redirect to dashboard')
  return { redirect: '/dashboard' }
}
