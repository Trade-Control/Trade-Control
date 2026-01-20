'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin configuration is missing')
  }
  return createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function ensureOrganization() {
  const user = await getCurrentUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  // Check if user already has organization
  const { data: profile } = await (supabase
    .from('profiles') as any)
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profile?.organization_id) {
    // Verify organization exists
    const { data: org } = await (supabase
      .from('organizations') as any)
      .select('id, onboarding_completed')
      .eq('id', profile.organization_id)
      .single()

    if (org) {
      return { success: true, organization_id: org.id, onboarding_completed: org.onboarding_completed }
    }
  }

  // Use admin client to check for subscription and create org if needed
  const supabaseAdmin = getSupabaseAdmin()
  
  // Check if profile was updated recently (webhook might have run)
  const { data: updatedProfile } = await (supabaseAdmin
    .from('profiles') as any)
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (updatedProfile?.organization_id) {
    const { data: org } = await (supabaseAdmin
      .from('organizations') as any)
      .select('id, onboarding_completed')
      .eq('id', updatedProfile.organization_id)
      .single()

    if (org) {
      return { success: true, organization_id: org.id, onboarding_completed: org.onboarding_completed }
    }
  }

  // Create new organization (fallback if webhook hasn't fired yet)
  // Use admin client to bypass RLS
  const { data: newOrg, error: orgError } = await (supabaseAdmin
    .from('organizations') as any)
    .insert({
      name: 'My Organization',
      onboarding_completed: false,
    })
    .select()
    .single()

  if (orgError || !newOrg) {
    console.error('Failed to create organization:', orgError)
    return { error: 'Failed to create organization. Please try again or contact support.' }
  }

  // Update profile with new organization using admin client
  const { error: updateError } = await (supabaseAdmin
    .from('profiles') as any)
    .update({ organization_id: newOrg.id })
    .eq('id', user.id)

  if (updateError) {
    console.error('Failed to update profile:', updateError)
    return { error: 'Failed to link organization. Please contact support.' }
  }

  return { success: true, organization_id: newOrg.id, onboarding_completed: false }
}

export async function updateOrganization(data: {
  name: string
  abn?: string
  address?: string
  city?: string
  state?: string
  postcode?: string
  phone?: string
  email?: string
}) {
  const user = await getCurrentUser()
  if (!user?.organization_id) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { error } = await (supabase
    .from('organizations') as any)
    .update({
      name: data.name,
      abn: data.abn || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      postcode: data.postcode || null,
      phone: data.phone || null,
      email: data.email || null,
      onboarding_completed: true,
    })
    .eq('id', user.organization_id)

  if (error) {
    console.error('Error updating organization:', error)
    return { error: error.message || 'Failed to update organization' }
  }

  return { success: true }
}
