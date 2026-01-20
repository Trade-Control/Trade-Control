'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase config:', { 
      hasUrl: !!supabaseUrl, 
      hasKey: !!serviceRoleKey 
    })
    throw new Error('Supabase admin configuration is missing')
  }
  
  return createAdminClient<Database>(supabaseUrl, serviceRoleKey)
}

export async function ensureOrganization() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      console.error('ensureOrganization: No user found - getCurrentUser returned null')
      return { error: 'Unauthorized - please log in' }
    }

    if (!user.id) {
      console.error('ensureOrganization: User has no ID', user)
      return { error: 'Invalid user session' }
    }

    console.log('ensureOrganization: User found', { userId: user.id, email: user.email, hasOrgId: !!user.organization_id })

    const supabase = await createClient()

    // Check if user already has organization
    const { data: profile, error: profileError } = await (supabase
      .from('profiles') as any)
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
    }

    if (profile?.organization_id) {
      // Verify organization exists
      const { data: org, error: orgError } = await (supabase
        .from('organizations') as any)
        .select('id, onboarding_completed')
        .eq('id', profile.organization_id)
        .single()

      if (orgError) {
        console.error('Error fetching organization:', orgError)
      }

      if (org) {
        console.log('Organization found:', org.id)
        return { success: true, organization_id: org.id, onboarding_completed: org.onboarding_completed }
      }
    }

    // Use admin client to check for subscription and create org if needed
    let supabaseAdmin
    try {
      supabaseAdmin = getSupabaseAdmin()
    } catch (adminError: any) {
      console.error('Failed to get admin client:', adminError)
      return { error: 'Server configuration error. Please contact support.' }
    }
    
    // Check if profile was updated recently (webhook might have run)
    const { data: updatedProfile, error: updatedProfileError } = await (supabaseAdmin
      .from('profiles') as any)
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (updatedProfileError) {
      console.error('Error fetching updated profile:', updatedProfileError)
    }

    if (updatedProfile?.organization_id) {
      const { data: org, error: orgError } = await (supabaseAdmin
        .from('organizations') as any)
        .select('id, onboarding_completed')
        .eq('id', updatedProfile.organization_id)
        .single()

      if (orgError) {
        console.error('Error fetching organization from admin:', orgError)
      }

      if (org) {
        console.log('Organization found via admin:', org.id)
        return { success: true, organization_id: org.id, onboarding_completed: org.onboarding_completed }
      }
    }

    // Create new organization (fallback if webhook hasn't fired yet)
    // Use admin client to bypass RLS
    console.log('Creating new organization for user:', user.id)
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
      return { error: `Failed to create organization: ${orgError?.message || 'Unknown error'}` }
    }

    console.log('Organization created:', newOrg.id)

    // Update profile with new organization using admin client
    const { error: updateError } = await (supabaseAdmin
      .from('profiles') as any)
      .update({ organization_id: newOrg.id })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to update profile:', updateError)
      return { error: `Failed to link organization: ${updateError.message || 'Unknown error'}` }
    }

    console.log('Profile updated with organization:', newOrg.id)
    return { success: true, organization_id: newOrg.id, onboarding_completed: false }
  } catch (error: any) {
    console.error('ensureOrganization exception:', error)
    console.error('Error stack:', error.stack)
    return { error: `Unexpected error: ${error.message || error.toString()}` }
  }
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
